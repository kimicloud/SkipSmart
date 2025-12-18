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
        this.pendingAttendance = {}; // Store pending changes per subject
        this.init();
    }

    init() {
        this.renderSubjects();
        this.updateOverallStats();
        this.updateZoneDashboard();
        this.updateAnalytics();
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
                this.updateAnalytics();
            }
        });

        const markAttendanceModal = document.getElementById('markAttendanceModal');
        const markPresentBtn = document.getElementById('markPresentBtn');
        const markAbsentBtn = document.getElementById('markAbsentBtn');
        const confirmAttendanceBtn = document.getElementById('confirmAttendanceBtn');
        const undoBtn = document.getElementById('undoBtn');
        const closeAttendanceModal = document.getElementById('closeAttendanceModal');

        markPresentBtn.addEventListener('click', () => {
            this.pendingPresent++;
            this.updateAttendanceSummary();
        });

        markAbsentBtn.addEventListener('click', () => {
            this.pendingAbsent++;
            this.updateAttendanceSummary();
        });

        confirmAttendanceBtn.addEventListener('click', () => {
            this.confirmAttendance();
        });

        undoBtn.addEventListener('click', () => {
            this.undoAttendance();
        });

        closeAttendanceModal.addEventListener('click', () => {
            markAttendanceModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        const reminderToggle = document.getElementById('reminderToggle');
        reminderToggle.addEventListener('change', (e) => {
            StorageManager.setRemindersEnabled(e.target.checked);
            if (e.target.checked) {
                this.requestNotificationPermission();
            }
        });
    }

    loadReminderPreference() {
        const reminderToggle = document.getElementById('reminderToggle');
        reminderToggle.checked = StorageManager.getRemindersEnabled();
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
        
        // Initialize pending attendance for all subjects
        subjects.forEach(subject => {
            if (!this.pendingAttendance[subject.id]) {
                this.pendingAttendance[subject.id] = { present: 0, absent: 0 };
            }
        });
        
        if (subjects.length === 0) {
            grid.innerHTML = '<p style="color: #607B8F; text-align: center; grid-column: 1/-1; font-size: 1.2rem; padding: 40px;">No subjects yet. Click "+ Add Subject" to get started!</p>';
            return;
        }
        
        grid.innerHTML = subjects.map(subject => {
            const percentage = subject.total === 0 ? 0 : (subject.attended / subject.total) * 100;
            const safeSkips = this.calculateSafeSkips(subject);
            const riskLevel = this.getRiskLevel(percentage);
            const daysSinceAttended = StorageManager.getDaysSinceLastAttendance(subject.lastAttendedDate);
            
            let reminderText = '';
            if (daysSinceAttended !== null && daysSinceAttended > 3 && percentage < 80) {
                reminderText = `<div class="reminder-section">⏰ ${daysSinceAttended} days since last attendance!</div>`;
            }
            
            let semesterInfo = '';
            let skipBudgetDisplay = '';
            let skipResultDisplay = '';
            
            if (subject.totalClassesInSemester) {
                const remaining = subject.totalClassesInSemester - subject.total;
                const totalSkipsAllowed = Math.floor(subject.totalClassesInSemester * 0.25); // 25% can be skipped
                const skipsRemaining = Math.max(0, totalSkipsAllowed - subject.skipsUsed);
                
                semesterInfo = `<div class="class-notes">📅 ${remaining} classes remaining this semester</div>`;
                
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
                        <div class="skip-budget-info">📊 Out of ${subject.totalClassesInSemester} classes • ${subject.total} attended</div>
                    </div>
                `;
            } else {
                skipBudgetDisplay = `
                    <div class="skip-counter">Skips used: ${subject.skipsUsed}</div>
                    <div class="skip-budget">Safe skips: ${safeSkips}</div>
                `;
            }
            
            return `
                <div class="subject-card">
                    <div class="subject-header">
                        <div class="subject-name">${subject.name}</div>
                        <button class="delete-subject" onclick="app.deleteSubject('${subject.id}')">✕</button>
                    </div>
                    
                    <div class="attendance-info">
                        <div class="attendance-fraction">${subject.attended}/${subject.total} classes</div>
                        <div class="attendance-percentage color-${riskLevel}">${percentage.toFixed(1)}%</div>
                        
                        <div class="progress-bar">
                            <div class="progress-fill risk-${riskLevel}" style="width: ${percentage}%"></div>
                        </div>
                        
                        ${subject.currentStreak > 0 ? `<div class="streak-badge">${subject.currentStreak} day streak</div>` : ''}
                        ${subject.bestStreak > 0 ? `<div class="class-notes">🏆 Best streak: ${subject.bestStreak} days</div>` : ''}
                        
                        ${skipBudgetDisplay}
                        
                        <div class="subject-skip-result" id="skipResult-${subject.id}" style="display: none;"></div>
                        
                        ${reminderText}
                        ${semesterInfo}
                    </div>
                    
                    <div class="attendance-marking-section">
                        <div class="attendance-marking-header">
                            <span class="marking-title">Mark Attendance</span>
                        </div>
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
            `;
        }).join('');
    }

    addPresent(subjectId) {
        if (!this.pendingAttendance[subjectId]) {
            this.pendingAttendance[subjectId] = { present: 0, absent: 0 };
        }
        this.pendingAttendance[subjectId].present++;
        this.updateSubjectCounters(subjectId);
    }

    // addAbsent(subjectId) {
    //     if (!this.pendingAttendance[subjectId]) {
    //         this.pendingAttendance[subjectId] = { present: 0, absent: 0 };
    //     }
    //     // this.pendingAttendance[subjectId].absent++;
    //     // this.updateSubjectCounters(subjectId);
    // }

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
        this.updateAnalytics();
    }


    undoSubjectAttendance(subjectId) {
        const subject = StorageManager.undoLastAttendance(subjectId);
        
        if (subject) {
            this.renderSubjects();
            this.updateOverallStats();
            this.updateZoneDashboard();
            this.updateAnalytics();
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
        
        // Get pending changes for this subject
        const pending = this.pendingAttendance[subjectId] || { present: 0, absent: 0 };
        
        // Calculate CURRENT attendance based on pending changes
        const currentAttended = subject.attended + pending.present;
        const currentTotal = subject.total + pending.present + pending.absent;
        const currentPercentage = currentTotal === 0 ? 0 : (currentAttended / currentTotal) * 100;
        
        // Calculate AFTER SKIPPING (add 1 absent to simulate skip)
        const afterSkipAttended = currentAttended; // Same, not attending
        const afterSkipTotal = currentTotal + 1; // One more class
        const afterSkipPercentage = (afterSkipAttended / afterSkipTotal) * 100;
        
        const afterSkipRiskLevel = this.getRiskLevel(afterSkipPercentage);
        
        // Calculate safe skips from CURRENT state
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
        
        // Decision based on AFTER SKIP percentage
        if (afterSkipRiskLevel === 'danger') {
            statusClass = 'status-danger';
            statusText = '🚫 DON\'T SKIP!';
            advice = `If you skip, your attendance will drop to <strong>${afterSkipPercentage.toFixed(1)}%</strong> (below 75%). You MUST attend!`;
            
            // Calculate classes needed to recover
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
        
        // Check if there are pending changes
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
                <div class="current-percentage color-${afterSkipRiskLevel}">${afterSkipPercentage.toFixed(1)}%</div>
                <div class="safe-skips">${safeSkips} safe skip(s) available now</div>
                <div class="skip-info" style="font-size: 0.95rem; text-align: center;">${advice}</div>
                <div class="status-indicator ${statusClass}">${statusText}</div>
                ${pendingNote}
            `;
            skipResultElement.style.display = 'block';
            
            skipResultElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    openAttendanceModal(subjectId) {
        // Legacy function - no longer used
    }

    updateAttendanceSummary() {
        // Legacy function - no longer used
    }

    confirmAttendance() {
        // Legacy function - no longer used
    }

    undoAttendance() {
        // Legacy function - no longer used
    }

    deleteSubject(subjectId) {
        if (confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
            StorageManager.deleteSubject(subjectId);
            this.renderSubjects();
            this.updateOverallStats();
            this.updateZoneDashboard();
            this.updateAnalytics();
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
        
        subjects.forEach(subject => {
            totalClasses += subject.total;
            attendedClasses += subject.attended;
        });
        
        const overallPercentage = totalClasses === 0 ? 0 : (attendedClasses / totalClasses) * 100;
        
        document.getElementById('overallPercentage').textContent = overallPercentage.toFixed(1) + '%';
        document.getElementById('totalClasses').textContent = totalClasses;
        document.getElementById('attendedClasses').textContent = attendedClasses;
    }

    updateAnalytics() {
        const subjects = StorageManager.getSubjects();
        
        if (subjects.length === 0) {
            document.getElementById('analyticsSection').style.display = 'none';
            return;
        }
        
        document.getElementById('analyticsSection').style.display = 'block';
        
        const bestAttendance = subjects.reduce((best, s) => {
            if (s.total === 0) return best;
            const perc = (s.attended / s.total) * 100;
            return perc > best.perc ? { name: s.name, perc } : best;
        }, { name: 'N/A', perc: 0 });
        
        const worstAttendance = subjects.reduce((worst, s) => {
            if (s.total === 0) return worst;
            const perc = (s.attended / s.total) * 100;
            return perc < worst.perc ? { name: s.name, perc } : worst;
        }, { name: 'N/A', perc: 100 });
        
        const totalSkips = subjects.reduce((sum, s) => sum + s.skipsUsed, 0);
        const bestStreak = subjects.reduce((max, s) => Math.max(max, s.bestStreak), 0);
        
        const atRisk = subjects.filter(s => {
            if (s.total === 0) return false;
            const perc = (s.attended / s.total) * 100;
            return perc < 80;
        }).length;
        
        const analyticsGrid = document.getElementById('analyticsGrid');
        analyticsGrid.innerHTML = `
            <div class="analytics-card">
                <h3>🏆 Best Attendance</h3>
                <div class="value">${bestAttendance.perc.toFixed(1)}%</div>
                <p>${bestAttendance.name}</p>
            </div>
            <div class="analytics-card">
                <h3>📉 Needs Attention</h3>
                <div class="value">${worstAttendance.perc.toFixed(1)}%</div>
                <p>${worstAttendance.name}</p>
            </div>
            <div class="analytics-card">
                <h3>⏭️ Total Skips</h3>
                <div class="value">${totalSkips}</div>
                <p>Classes missed</p>
            </div>
            <div class="analytics-card">
                <h3>🔥 Best Streak</h3>
                <div class="value">${bestStreak}</div>
                <p>Consecutive days</p>
            </div>
            <div class="analytics-card">
                <h3>⚠️ At Risk</h3>
                <div class="value">${atRisk}</div>
                <p>Subject(s) below 80%</p>
            </div>
        `;
    }
}

const app = new SkipSmart();