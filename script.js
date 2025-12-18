// Storage Manager
const StorageManager = {
    getSubjects() {
        const data = localStorage.getItem('skipsmart_subjects');
        return data ? JSON.parse(data) : [];
    },

    saveSubjects(subjects) {
        localStorage.setItem('skipsmart_subjects', JSON.stringify(subjects));
    },

    addSubject(name, totalClassesInSemester = null) {
        const subjects = this.getSubjects();
        const newSubject = {
            id: Date.now().toString(),
            name: name,
            attended: 0,
            total: 0,
            skipsUsed: 0,
            currentStreak: 0,
            bestStreak: 0,
            lastAttendedDate: null,
            totalClassesInSemester: totalClassesInSemester,
            history: []
        };
        subjects.push(newSubject);
        this.saveSubjects(subjects);
        return newSubject;
    },

    deleteSubject(id) {
        let subjects = this.getSubjects();
        subjects = subjects.filter(s => s.id !== id);
        this.saveSubjects(subjects);
    },

    updateAttendance(id, isPresent) {
        const subjects = this.getSubjects();
        const subject = subjects.find(s => s.id === id);
        
        if (subject) {
            subject.total++;
            
            if (isPresent) {
                subject.attended++;
                subject.currentStreak++;
                subject.lastAttendedDate = new Date().toISOString();
                
                if (subject.currentStreak > subject.bestStreak) {
                    subject.bestStreak = subject.currentStreak;
                }
            } else {
                subject.currentStreak = 0;
                subject.skipsUsed++;
            }
            
            subject.history.push({
                date: new Date().toISOString(),
                present: isPresent
            });
            
            this.saveSubjects(subjects);
            return subject;
        }
        return null;
    },

    undoLastAttendance(id) {
        const subjects = this.getSubjects();
        const subject = subjects.find(s => s.id === id);
        
        if (subject && subject.history.length > 0) {
            const lastEntry = subject.history.pop();
            subject.total--;
            
            if (lastEntry.present) {
                subject.attended--;
                subject.currentStreak = Math.max(0, subject.currentStreak - 1);
            } else {
                subject.skipsUsed = Math.max(0, subject.skipsUsed - 1);
            }
            
            this.recalculateStreak(subject);
            this.saveSubjects(subjects);
            return subject;
        }
        return null;
    },

    recalculateStreak(subject) {
        if (subject.history.length === 0) {
            subject.currentStreak = 0;
            return;
        }

        let streak = 0;
        for (let i = subject.history.length - 1; i >= 0; i--) {
            if (subject.history[i].present) {
                streak++;
            } else {
                break;
            }
        }
        subject.currentStreak = streak;
    },

    getSubject(id) {
        const subjects = this.getSubjects();
        return subjects.find(s => s.id === id);
    },

    getDaysSinceLastAttendance(lastAttendedDate) {
        if (!lastAttendedDate) return null;
        
        const lastDate = new Date(lastAttendedDate);
        const today = new Date();
        const diffTime = Math.abs(today - lastDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    },

    getRemindersEnabled() {
        return localStorage.getItem('skipsmart_reminders') === 'true';
    },

    setRemindersEnabled(enabled) {
        localStorage.setItem('skipsmart_reminders', enabled.toString());
    }
};

// Main App
class SkipSmart {
    constructor() {
        this.currentSubjectId = null;
        this.pendingAttendance = {};
        this.init();
    }

    init() {
        this.renderSubjects();
        this.updateOverallStats();
        this.updateZoneDashboard();
        this.setupEventListeners();
        this.loadReminderPreference();
        this.checkReminders();
    }

    setupEventListeners() {
        const addSubjectBtn = document.getElementById('addSubjectBtn');
        const addSubjectModal = document.getElementById('addSubjectModal');
        const addSubjectForm = document.getElementById('addSubjectForm');
        const closeAddModal = document.getElementById('closeAddModal');
        
        addSubjectBtn.addEventListener('click', () => {
            addSubjectModal.style.display = 'block';
        });

        closeAddModal.addEventListener('click', () => {
            addSubjectModal.style.display = 'none';
        });

        addSubjectForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const subjectName = document.getElementById('subjectName').value.trim();
            const totalClasses = document.getElementById('totalClassesInput').value;
            const totalClassesNum = totalClasses ? parseInt(totalClasses) : null;
            
            if (subjectName) {
                StorageManager.addSubject(subjectName, totalClassesNum);
                document.getElementById('subjectName').value = '';
                document.getElementById('totalClassesInput').value = '';
                addSubjectModal.style.display = 'none';
                this.renderSubjects();
                this.updateOverallStats();
                this.updateZoneDashboard();
            }
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    loadReminderPreference() {
        // Reminders are always enabled in the background
        // No UI toggle needed
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('SkipSmart', {
                        body: 'Class reminders enabled! We\'ll notify you when attendance is low.',
                        icon: '🔔'
                    });
                }
            });
        }
    }

    checkReminders() {
        if (!StorageManager.getRemindersEnabled()) return;
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const subjects = StorageManager.getSubjects();

        subjects.forEach(subject => {
            if (subject.total === 0) return;

            const percentage = (subject.attended / subject.total) * 100;

            if (percentage < 75) {
                new Notification('🚨 Attendance Critical!', {
                    body: `${subject.name}: ${percentage.toFixed(1)}%\nSkipping any more classes will make you INELIGIBLE.`,
                    icon: '🔴'
                });
            } 
            else if (percentage < 80) {
                new Notification('🟡 Attendance Warning', {
                    body: `${subject.name}: ${percentage.toFixed(1)}% - Be careful! Close to danger zone.`,
                    icon: '🟡'
                });
            }
        });

        setTimeout(() => this.checkReminders(), 3600000);
    }

    renderSubjects() {
        const subjects = StorageManager.getSubjects();
        const grid = document.getElementById('subjectsGrid');
        
        subjects.forEach(subject => {
            if (!this.pendingAttendance[subject.id]) {
                this.pendingAttendance[subject.id] = { present: 0, absent: 0 };
            }
        });
        
        if (subjects.length === 0) {
            grid.innerHTML = '<p style="color: #607B8F; text-align: center; font-size: 1.2rem; padding: 40px;">No subjects yet. Click "+ Add Subject" to get started!</p>';
            return;
        }
        
        grid.innerHTML = subjects.map(subject => {
            const percentage = subject.total === 0 ? 0 : (subject.attended / subject.total) * 100;
            const safeSkips = this.calculateSafeSkips(subject);
            const riskLevel = this.getRiskLevel(percentage);
            
            // Calculate analytics
            const attendanceRate = percentage;
            const classesNeededFor80 = this.calculateClassesNeeded(subject, 80);
            const classesNeededFor75 = this.calculateClassesNeeded(subject, 75);
            const projectedSemesterAttendance = this.calculateProjectedAttendance(subject);
            const consecutiveSkips = this.calculateConsecutiveSkips(subject);
            
            let skipBudgetDisplay = '';
            
            if (subject.totalClassesInSemester) {
                const remaining = subject.totalClassesInSemester - subject.total;
                const totalSkipsAllowed = Math.floor(subject.totalClassesInSemester * 0.25);
                const skipsRemaining = Math.max(0, totalSkipsAllowed - subject.skipsUsed);
                
                let budgetColor = 'safe';
                if (skipsRemaining <= 2) budgetColor = 'danger';
                else if (skipsRemaining <= 5) budgetColor = 'caution';
                
                skipBudgetDisplay = `
                    <div class="skip-budget-card">
                        <div class="skip-budget-main">
                            <div class="skip-budget-number color-${budgetColor}">${skipsRemaining}</div>
                            <div class="skip-budget-label">Skips Left</div>
                        </div>
                        <div class="skip-budget-used">
                            <div class="skip-used-number">${subject.skipsUsed}</div>
                            <div class="skip-used-label">Used</div>
                        </div>
                    </div>
                `;
            } else {
                skipBudgetDisplay = `
                    <div class="skip-counter">⏭️ Skips used: ${subject.skipsUsed}</div>
                    <div class="skip-budget">🎯 Safe skips: ${safeSkips}</div>
                `;
            }
            
            return `
                <div class="subject-card">
                    <div class="subject-left">
                        <div class="subject-header">
                            <div class="subject-name">${subject.name}</div>
                            <button class="delete-subject" onclick="app.deleteSubject('${subject.id}')">✕</button>
                        </div>
                        
                        <div class="attendance-main">
                            <div class="attendance-percentage color-${riskLevel}">${percentage.toFixed(1)}%</div>
                            <div class="attendance-fraction">${subject.attended}/${subject.total} classes</div>
                            <div class="progress-bar">
                                <div class="progress-fill risk-${riskLevel}" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                        
                        ${skipBudgetDisplay}
                        
                        <div class="attendance-marking-section">
                            <div class="marking-title">Mark Attendance</div>
                            <div class="attendance-counters">
                                <div class="counter-group">
                                    <button class="counter-btn present-counter" onclick="app.addPresent('${subject.id}')">
                                        <span class="counter-icon">✓</span>
                                        <span class="counter-label">Present</span>
                                    </button>
                                    <div class="counter-display present-display" id="presentDisplay-${subject.id}">0</div>
                                </div>
                                <div class="counter-group">
                                    <button class="counter-btn absent-counter" onclick="app.addAbsent('${subject.id}')">
                                        <span class="counter-icon">✕</span>
                                        <span class="counter-label">Absent</span>
                                    </button>
                                    <div class="counter-display absent-display" id="absentDisplay-${subject.id}">0</div>
                                </div>
                            </div>
                            <button class="confirm-attendance-btn" id="confirmBtn-${subject.id}" onclick="app.confirmSubjectAttendance('${subject.id}')" disabled>
                                ✓ Save Changes
                            </button>
                        </div>
                        
                        <div class="subject-actions">
                            <button class="btn btn-primary" onclick="app.showSkipCalculator('${subject.id}')">Can I Skip?</button>
                            <button class="undo-btn" onclick="app.undoSubjectAttendance('${subject.id}')">↶ Undo Last</button>
                        </div>
                    </div>
                    
                    <div class="subject-right">
                        <div class="analytics-section">
                            <h3>Subject Analytics</h3>
                            <div class="analytics-grid">
                                <div class="analytics-card">
                                    <div class="icon">🎯</div>
                                    <div class="value">${subject.total}</div>
                                    <div class="label">Total Classes</div>
                                </div>
                                <div class="analytics-card">
                                    <div class="icon">✅</div>
                                    <div class="value">${subject.attended}</div>
                                    <div class="label">Attended</div>
                                </div>
                                <div class="analytics-card">
                                    <div class="icon">❌</div>
                                    <div class="value">${subject.skipsUsed}</div>
                                    <div class="label">Skipped</div>
                                </div>
                                <div class="analytics-card">
                                    <div class="icon">🔥</div>
                                    <div class="value">${subject.currentStreak}</div>
                                    <div class="label">Current Streak</div>
                                </div>
                                <div class="analytics-card">
                                    <div class="icon">🏆</div>
                                    <div class="value">${subject.bestStreak}</div>
                                    <div class="label">Best Streak</div>
                                </div>
                                <div class="analytics-card">
                                    <div class="icon">🎯</div>
                                    <div class="value">${safeSkips}</div>
                                    <div class="label">Safe Skips</div>
                                </div>
                            </div>
                            
                            ${subject.total > 0 ? `
                                <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #E0E0E0;">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                                        <div style="background: white; padding: 12px; border-radius: 8px; text-align: center;">
                                            <div style="font-size: 0.8rem; color: #607B8F; font-weight: 600; margin-bottom: 5px;">Classes for 80%</div>
                                            <div style="font-size: 1.5rem; font-weight: 800; color: ${classesNeededFor80 === 0 ? '#28a745' : '#E97F4A'};">${classesNeededFor80}</div>
                                        </div>
                                        <div style="background: white; padding: 12px; border-radius: 8px; text-align: center;">
                                            <div style="font-size: 0.8rem; color: #607B8F; font-weight: 600; margin-bottom: 5px;">Classes for 75%</div>
                                            <div style="font-size: 1.5rem; font-weight: 800; color: ${classesNeededFor75 === 0 ? '#28a745' : '#E97F4A'};">${classesNeededFor75}</div>
                                        </div>
                                    </div>
                                    ${projectedSemesterAttendance ? `
                                        <div style="background: white; padding: 12px; border-radius: 8px; text-align: center;">
                                            <div style="font-size: 0.8rem; color: #607B8F; font-weight: 600; margin-bottom: 5px;">📈 Projected Semester</div>
                                            <div style="font-size: 1.5rem; font-weight: 800; color: #434E78;">${projectedSemesterAttendance}%</div>
                                        </div>
                                    ` : ''}
                                    ${consecutiveSkips > 1 ? `
                                        <div style="background: #F8D7DA; padding: 12px; border-radius: 8px; text-align: center; margin-top: 10px; border: 2px solid #E97F4A;">
                                            <div style="font-size: 0.85rem; color: #721C24; font-weight: 700;">⚠️ ${consecutiveSkips} consecutive skips!</div>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="subject-skip-result" id="skipResult-${subject.id}" style="display: none;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    calculateClassesNeeded(subject, targetPercentage) {
        if (subject.total === 0) return 0;
        
        const currentPercentage = (subject.attended / subject.total) * 100;
        
        if (currentPercentage >= targetPercentage) return 0;
        
        let classesNeeded = 0;
        let tempAttended = subject.attended;
        let tempTotal = subject.total;
        
        while (tempTotal < 1000) {
            tempAttended++;
            tempTotal++;
            classesNeeded++;
            
            const newPercentage = (tempAttended / tempTotal) * 100;
            if (newPercentage >= targetPercentage) {
                break;
            }
        }
        
        return classesNeeded;
    }

    calculateProjectedAttendance(subject) {
        if (!subject.totalClassesInSemester || subject.total === 0) return null;
        
        const remaining = subject.totalClassesInSemester - subject.total;
        if (remaining <= 0) return null;
        
        const currentRate = subject.attended / subject.total;
        const projectedAttended = subject.attended + Math.floor(remaining * currentRate);
        const projectedPercentage = (projectedAttended / subject.totalClassesInSemester) * 100;
        
        return projectedPercentage.toFixed(1);
    }

    calculateConsecutiveSkips(subject) {
        if (subject.history.length === 0) return 0;
        
        let consecutiveSkips = 0;
        for (let i = subject.history.length - 1; i >= 0; i--) {
            if (!subject.history[i].present) {
                consecutiveSkips++;
            } else {
                break;
            }
        }
        
        return consecutiveSkips;
    }

    addPresent(subjectId) {
        if (!this.pendingAttendance[subjectId]) {
            this.pendingAttendance[subjectId] = { present: 0, absent: 0 };
        }
        this.pendingAttendance[subjectId].present++;
        this.updateSubjectCounters(subjectId);
    }

    addAbsent(subjectId) {
        const subject = StorageManager.getSubject(subjectId);
        if (!subject) return;

        const pending = this.pendingAttendance[subjectId] || { present: 0, absent: 0 };
        const willBeDanger = this.willSubjectBecomeDanger(subject, pending.absent + 1);

        if (willBeDanger) {
            alert(
                `🚫 Attendance Warning\n\n` +
                `If you skip this class today, "${subject.name}" will fall below 75%.\n` +
                `You will NOT meet the attendance criteria.`
            );

            if (StorageManager.getRemindersEnabled() &&
                'Notification' in window &&
                Notification.permission === 'granted') {

                new Notification('🚨 Attendance Risk!', {
                    body: `"${subject.name}" will fall below 75% if you skip this class.`,
                    icon: '🔴'
                });
            }
        }

        pending.absent++;
        this.pendingAttendance[subjectId] = pending;
        this.updateSubjectCounters(subjectId);
    }

    updateSubjectCounters(subjectId) {
        const presentDisplay = document.getElementById(`presentDisplay-${subjectId}`);
        const absentDisplay = document.getElementById(`absentDisplay-${subjectId}`);
        const confirmBtn = document.getElementById(`confirmBtn-${subjectId}`);
        
        if (presentDisplay && absentDisplay && confirmBtn) {
            presentDisplay.textContent = this.pendingAttendance[subjectId].present;
            absentDisplay.textContent = this.pendingAttendance[subjectId].absent;
            
            const hasChanges = this.pendingAttendance[subjectId].present > 0 || 
                              this.pendingAttendance[subjectId].absent > 0;
            confirmBtn.disabled = !hasChanges;
        }
    }

    confirmSubjectAttendance(subjectId) {
        const pending = this.pendingAttendance[subjectId];
        if (!pending || (pending.present === 0 && pending.absent === 0)) return;

        const totalAbsentsToday = Object.values(this.pendingAttendance)
            .reduce((sum, p) => sum + p.absent, 0);

        if (totalAbsentsToday > 0 && this.willOverallBecomeDanger(totalAbsentsToday)) {
            alert(
                `⚠️ Overall Attendance Warning\n\n` +
                `Skipping today's classes will drop your OVERALL attendance below eligibility criteria.`
            );

            if (
                StorageManager.getRemindersEnabled() &&
                'Notification' in window &&
                Notification.permission === 'granted'
            ) {
                new Notification('⚠️ Overall Attendance Risk', {
                    body: 'Skipping today will affect your overall attendance eligibility.',
                    icon: '⚠️'
                });
            }
        }

        for (let i = 0; i < pending.present; i++) {
            StorageManager.updateAttendance(subjectId, true);
        }

        for (let i = 0; i < pending.absent; i++) {
            StorageManager.updateAttendance(subjectId, false);
        }

        this.pendingAttendance[subjectId] = { present: 0, absent: 0 };

        this.renderSubjects();
        this.updateOverallStats();
        this.updateZoneDashboard();
    }

    undoSubjectAttendance(subjectId) {
        const subject = StorageManager.undoLastAttendance(subjectId);
        
        if (subject) {
            this.renderSubjects();
            this.updateOverallStats();
            this.updateZoneDashboard();
        } else {
            alert('No attendance record to undo!');
        }
    }

    calculateSafeSkips(subject) {
        if (subject.total === 0) return 0;
        
        const currentPercentage = (subject.attended / subject.total) * 100;
        const targetPercentage = 75;
        
        if (currentPercentage < targetPercentage) return 0;
        
        let skips = 0;
        let tempAttended = subject.attended;
        let tempTotal = subject.total;
        
        while (tempTotal < 1000) {
            const newPercentage = (tempAttended / (tempTotal + 1)) * 100;
            if (newPercentage >= targetPercentage) {
                skips++;
                tempTotal++;
            } else {
                break;
            }
        }
        
        return skips;
    }

    getRiskLevel(percentage) {
        if (percentage >= 80) return 'safe';
        if (percentage >= 75) return 'caution';
        return 'danger';
    }

    willSubjectBecomeDanger(subject, pendingAbsent = 1) {
        const attended = subject.attended;
        const total = subject.total;

        const futureTotal = total + pendingAbsent;
        const futurePercentage = (attended / futureTotal) * 100;

        return futurePercentage < 75;
    }

    willOverallBecomeDanger(extraAbsents) {
        const subjects = StorageManager.getSubjects();

        let attended = 0;
        let total = 0;

        subjects.forEach(s => {
            attended += s.attended;
            total += s.total;
        });

        const futureTotal = total + extraAbsents;
        const futurePercentage = (attended / futureTotal) * 100;

        return futurePercentage < 75;
    }

    showSkipCalculator(subjectId) {
        const subject = StorageManager.getSubject(subjectId);
        if (!subject) return;
        
        const pending = this.pendingAttendance[subjectId] || { present: 0, absent: 0 };
        
        const currentAttended = subject.attended + pending.present;
        const currentTotal = subject.total + pending.present + pending.absent;
        const currentPercentage = currentTotal === 0 ? 0 : (currentAttended / currentTotal) * 100;
        
        const afterSkipAttended = currentAttended;
        const afterSkipTotal = currentTotal + 1;
        const afterSkipPercentage = (afterSkipAttended / afterSkipTotal) * 100;
        
        const afterSkipRiskLevel = this.getRiskLevel(afterSkipPercentage);
        
        let safeSkips = 0;
        if (currentTotal > 0) {
            const targetPercentage = 75;
            
            if (currentPercentage < targetPercentage) {
                safeSkips = 0;
            } else {
                let tempAttended = currentAttended;
                let tempTotal = currentTotal;
                
                while (tempTotal < 1000) {
                    const newPercentage = (tempAttended / (tempTotal + 1)) * 100;
                    if (newPercentage >= targetPercentage) {
                        safeSkips++;
                        tempTotal++;
                    } else {
                        break;
                    }
                }
            }
        }
        
        let statusClass = 'status-safe';
        let statusText = '✅ Safe to Skip!';
        let advice = '';
        
        if (afterSkipRiskLevel === 'danger') {
            statusClass = 'status-danger';
            statusText = '🚫 DON\'T SKIP!';
            advice = `If you skip, your attendance will drop to <strong>${afterSkipPercentage.toFixed(1)}%</strong> (below 75%). You MUST attend!`;
            
            let classesNeeded = 0;
            let tempAttended = currentAttended;
            let tempTotal = currentTotal;
            
            while (tempTotal < 1000) {
                tempAttended++;
                tempTotal++;
                classesNeeded++;
                const newPercentage = (tempAttended / tempTotal) * 100;
                if (newPercentage >= 75) {
                    break;
                }
            }
            
            advice += ` You need ${classesNeeded} consecutive classes to reach safe zone.`;
        } else if (afterSkipRiskLevel === 'caution') {
            statusClass = 'status-caution';
            statusText = '⚠️ Risky!';
            advice = `If you skip, your attendance will be <strong>${afterSkipPercentage.toFixed(1)}%</strong> (caution zone). `;
            if (safeSkips <= 1) {
                advice += `This is your last safe skip! Next skip will be dangerous.`;
            } else {
                advice += `You'll have ${safeSkips - 1} safe skip(s) left after this.`;
            }
        } else {
            statusClass = 'status-safe';
            statusText = '✅ Safe to Skip!';
            advice = `If you skip, your attendance will be <strong>${afterSkipPercentage.toFixed(1)}%</strong> (still safe). `;
            advice += `You can skip ${safeSkips} more time(s) safely.`;
        }
        
        const hasPendingChanges = pending.present > 0 || pending.absent > 0;
        let pendingNote = '';
        
        if (hasPendingChanges) {
            pendingNote = `<div style="font-size: 0.85rem; color: #607B8F; font-style: italic; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #E0E0E0;">
                💡 Calculated with pending changes: +${pending.present} present, -${pending.absent} absent
            </div>`;
        }
        
        const skipResultElement = document.getElementById(`skipResult-${subjectId}`);
        
        if (skipResultElement) {
            skipResultElement.innerHTML = `
                <div style="font-size: 1rem; color: #607B8F; font-weight: 600; margin-bottom: 10px;">
                    Current: <span class="color-${this.getRiskLevel(currentPercentage)}" style="font-size: 1.3rem; font-weight: 800;">${currentPercentage.toFixed(1)}%</span>
                </div>
                <div style="font-size: 1.5rem; margin: 8px 0;">⬇️</div>
                <div style="font-size: 1rem; color: #607B8F; font-weight: 600; margin-bottom: 8px;">After 1 Skip:</div>
                <div class="attendance-percentage color-${afterSkipRiskLevel}" style="font-size: 2.5rem;">${afterSkipPercentage.toFixed(1)}%</div>
                <div style="font-size: 0.95rem; margin: 10px 0; font-weight: 600; color: #434E78;">${safeSkips} safe skip(s) available now</div>
                <div style="font-size: 0.95rem; text-align: center; margin: 10px 0;">${advice}</div>
                <div class="status-indicator ${statusClass}">${statusText}</div>
                ${pendingNote}
            `;
            skipResultElement.style.display = 'block';
            
            skipResultElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    deleteSubject(subjectId) {
        if (confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
            StorageManager.deleteSubject(subjectId);
            this.renderSubjects();
            this.updateOverallStats();
            this.updateZoneDashboard();
        }
    }

    updateZoneDashboard() {
        const subjects = StorageManager.getSubjects();
        
        let safeZone = [];
        let cautionZone = [];
        let dangerZone = [];
        
        subjects.forEach(subject => {
            if (subject.total === 0) return;
            
            const percentage = (subject.attended / subject.total) * 100;
            const subjectData = {
                name: subject.name,
                percentage: percentage.toFixed(1),
                id: subject.id
            };
            
            if (percentage >= 80) {
                safeZone.push(subjectData);
            } else if (percentage >= 75) {
                cautionZone.push(subjectData);
            } else {
                dangerZone.push(subjectData);
            }
        });
        
        document.getElementById('safeZoneCount').textContent = safeZone.length;
        document.getElementById('cautionZoneCount').textContent = cautionZone.length;
        document.getElementById('dangerZoneCount').textContent = dangerZone.length;
        
        const zoneSubjects = document.getElementById('zoneSubjects');
        
        if (subjects.length === 0 || subjects.every(s => s.total === 0)) {
            zoneSubjects.innerHTML = '<div class="zone-empty">No subjects with attendance data yet.</div>';
            return;
        }
        
        let zoneHTML = '';
        
        if (dangerZone.length > 0) {
            zoneHTML += `
                <div class="zone-section">
                    <div class="zone-section-title">
                        🔴 Danger Zone - Immediate Attention Required
                    </div>
                    <div class="zone-subject-list">
                        ${dangerZone.map(s => `
                            <div class="zone-subject-tag tag-danger" onclick="app.showSkipCalculator('${s.id}')">
                                ${s.name} (${s.percentage}%)
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (cautionZone.length > 0) {
            zoneHTML += `
                <div class="zone-section">
                    <div class="zone-section-title">
                        🟡 Caution Zone - Be Careful
                    </div>
                    <div class="zone-subject-list">
                        ${cautionZone.map(s => `
                            <div class="zone-subject-tag tag-caution" onclick="app.showSkipCalculator('${s.id}')">
                                ${s.name} (${s.percentage}%)
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (safeZone.length > 0) {
            zoneHTML += `
                <div class="zone-section">
                    <div class="zone-section-title">
                        🟢 Safe Zone - You're Doing Great!
                    </div>
                    <div class="zone-subject-list">
                        ${safeZone.map(s => `
                            <div class="zone-subject-tag tag-safe" onclick="app.showSkipCalculator('${s.id}')">
                                ${s.name} (${s.percentage}%)
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        zoneSubjects.innerHTML = zoneHTML || '<div class="zone-empty">No subjects with attendance data yet.</div>';
    }

    updateOverallStats() {
        const subjects = StorageManager.getSubjects();
        
        let totalClasses = 0;
        let attendedClasses = 0;
        let totalSkips = 0;
        let bestStreak = 0;
        
        subjects.forEach(subject => {
            totalClasses += subject.total;
            attendedClasses += subject.attended;
            totalSkips += subject.skipsUsed;
            bestStreak = Math.max(bestStreak, subject.bestStreak);
        });
        
        const overallPercentage = totalClasses === 0 ? 0 : (attendedClasses / totalClasses) * 100;
        
        document.getElementById('overallPercentage').textContent = overallPercentage.toFixed(1) + '%';
        document.getElementById('totalClasses').textContent = totalClasses;
        document.getElementById('attendedClasses').textContent = attendedClasses;
        document.getElementById('totalSkips').textContent = totalSkips;
        document.getElementById('bestStreak').textContent = bestStreak;
        
        // Update overall analytics
        const overallAnalytics = document.getElementById('overallAnalytics');
        
        if (subjects.length === 0 || totalClasses === 0) {
            overallAnalytics.innerHTML = '';
            return;
        }
        
        const bestSubject = subjects.reduce((best, s) => {
            if (s.total === 0) return best;
            const perc = (s.attended / s.total) * 100;
            return perc > best.perc ? { name: s.name, perc } : best;
        }, { name: 'N/A', perc: 0 });
        
        const worstSubject = subjects.reduce((worst, s) => {
            if (s.total === 0) return worst;
            const perc = (s.attended / s.total) * 100;
            return perc < worst.perc ? { name: s.name, perc } : worst;
        }, { name: 'N/A', perc: 100 });
        
        const atRiskCount = subjects.filter(s => {
            if (s.total === 0) return false;
            const perc = (s.attended / s.total) * 100;
            return perc < 80;
        }).length;
        
        const avgAttendance = subjects.filter(s => s.total > 0)
            .reduce((sum, s) => sum + ((s.attended / s.total) * 100), 0) / 
            Math.max(subjects.filter(s => s.total > 0).length, 1);
        
        const totalSafeSkips = subjects.reduce((sum, s) => sum + this.calculateSafeSkips(s), 0);
        
        overallAnalytics.innerHTML = `
            <div class="overall-analytics-card">
                <div class="label">🏆 Best Subject</div>
                <div class="value">${bestSubject.perc.toFixed(1)}%</div>
                <div style="font-size: 0.85rem; color: #434E78; font-weight: 600; margin-top: 5px;">${bestSubject.name}</div>
            </div>
            <div class="overall-analytics-card">
                <div class="label">📉 Needs Attention</div>
                <div class="value">${worstSubject.perc.toFixed(1)}%</div>
                <div style="font-size: 0.85rem; color: #434E78; font-weight: 600; margin-top: 5px;">${worstSubject.name}</div>
            </div>
            <div class="overall-analytics-card">
                <div class="label">⚠️ At Risk Subjects</div>
                <div class="value">${atRiskCount}</div>
                <div style="font-size: 0.85rem; color: #434E78; font-weight: 600; margin-top: 5px;">Below 80%</div>
            </div>
            <div class="overall-analytics-card">
                <div class="label">📊 Average Attendance</div>
                <div class="value">${avgAttendance.toFixed(1)}%</div>
                <div style="font-size: 0.85rem; color: #434E78; font-weight: 600; margin-top: 5px;">Across All Subjects</div>
            </div>
            <div class="overall-analytics-card">
                <div class="label">🎯 Total Safe Skips</div>
                <div class="value">${totalSafeSkips}</div>
                <div style="font-size: 0.85rem; color: #434E78; font-weight: 600; margin-top: 5px;">Available Now</div>
            </div>
        `;
    }
}

const app = new SkipSmart();