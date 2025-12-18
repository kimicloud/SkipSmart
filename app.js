// // Main Application Logic
// class SkipSmart {
//     constructor() {
//         this.currentSubjectId = null;
//         this.init();
//     }

//     init() {
//         this.renderSubjects();
//         this.updateOverallStats();
//         this.setupEventListeners();
//     }

//     setupEventListeners() {
//         // Add Subject Modal
//         const addSubjectBtn = document.getElementById('addSubjectBtn');
//         const addSubjectModal = document.getElementById('addSubjectModal');
//         const addSubjectForm = document.getElementById('addSubjectForm');
        
//         addSubjectBtn.addEventListener('click', () => {
//             addSubjectModal.style.display = 'block';
//         });

//         addSubjectForm.addEventListener('submit', (e) => {
//             e.preventDefault();
//             const subjectName = document.getElementById('subjectName').value;
//             StorageManager.addSubject(subjectName);
//             document.getElementById('subjectName').value = '';
//             addSubjectModal.style.display = 'none';
//             this.renderSubjects();
//             this.updateOverallStats();
//         });

//         // Mark Attendance Modal
//         const markAttendanceModal = document.getElementById('markAttendanceModal');
//         const markPresentBtn = document.getElementById('markPresentBtn');
//         const markAbsentBtn = document.getElementById('markAbsentBtn');
//         const undoBtn = document.getElementById('undoBtn');

//         markPresentBtn.addEventListener('click', () => {
//             this.markAttendance(true);
//         });

//         markAbsentBtn.addEventListener('click', () => {
//             this.markAttendance(false);
//         });

//         undoBtn.addEventListener('click', () => {
//             this.undoAttendance();
//         });

//         // Close modals
//         const closeButtons = document.querySelectorAll('.close');
//         closeButtons.forEach(btn => {
//             btn.addEventListener('click', (e) => {
//                 e.target.closest('.modal').style.display = 'none';
//             });
//         });

//         // Close modal when clicking outside
//         window.addEventListener('click', (e) => {
//             if (e.target.classList.contains('modal')) {
//                 e.target.style.display = 'none';
//             }
//         });
//     }

//     renderSubjects() {
//         const subjects = StorageManager.getSubjects();
//         const grid = document.getElementById('subjectsGrid');
        
//         if (subjects.length === 0) {
//             grid.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">No subjects added yet. Click "Add Subject" to get started!</p>';
//             return;
//         }

//         grid.innerHTML = subjects.map(subject => {
//             const percentage = subject.total > 0 ? ((subject.attended / subject.total) * 100).toFixed(1) : 0;
//             const riskClass = this.getRiskClass(percentage);
//             const prediction = this.calculatePrediction(subject);

//             // Calculate days since last attendance
//             const daysSince = StorageManager.getDaysSinceLastAttendance(subject.lastAttendedDate);
//             let lastAttendedText = 'No classes yet';
//             if (daysSince === 0) {
//                 lastAttendedText = 'Last attended: Today';
//             } else if (daysSince === 1) {
//                 lastAttendedText = 'Last attended: Yesterday';
//             } else if (daysSince !== null) {
//                 lastAttendedText = `Last attended: ${daysSince} days ago`;
//             }

//             return `
//                 <div class="subject-card">
//                     <div class="subject-header">
//                         <div class="subject-name">${subject.name}</div>
//                         <button class="delete-subject" onclick="app.deleteSubject('${subject.id}')">×</button>
//                     </div>
//                     <div class="attendance-info">
//                         <div class="attendance-fraction">${subject.attended} / ${subject.total} classes</div>
//                         <div class="attendance-percentage color-${riskClass}">${percentage}%</div>
                        
//                         ${subject.currentStreak > 0 ? `<div class="streak-badge">${subject.currentStreak} Day Streak!</div>` : ''}
                        
//                         <div class="skip-counter">Skips used: ${subject.skipsUsed}</div>
                        
//                         <div class="progress-bar">
//                             <div class="progress-fill risk-${riskClass}" style="width: ${percentage}%"></div>
//                         </div>
                        
//                         <div class="class-notes">${lastAttendedText}</div>
                        
//                         <div class="prediction">${prediction}</div>
//                     </div>
//                     <div class="subject-actions">
//                         <button class="btn btn-primary" onclick="app.openAttendanceModal('${subject.id}')">Mark Attendance</button>
//                         <button class="btn btn-secondary" onclick="app.checkSkip('${subject.id}')">Can I Skip?</button>
//                     </div>
//                 </div>
//             `;
//         }).join('');
//     }

//     getRiskClass(percentage) {
//         if (percentage >= 80) return 'safe';
//         if (percentage >= 75) return 'caution';
//         return 'danger';
//     }

//     calculatePrediction(subject) {
//         if (subject.total < 5) {
//             return '📊 Not enough data for prediction';
//         }

//         // Simple prediction based on last few classes
//         const recentClasses = subject.history.slice(-10);
//         const recentAttended = recentClasses.filter(h => h.present).length;
//         const recentRate = (recentAttended / recentClasses.length) * 100;

//         const projectedEnd = recentRate.toFixed(1);
        
//         if (projectedEnd >= 80) {
//             return `📈 Trending: ${projectedEnd}% (Excellent pace!)`;
//         } else if (projectedEnd >= 75) {
//             return `📊 Trending: ${projectedEnd}% (Maintain this!)`;
//         } else {
//             return `⚠️ Trending: ${projectedEnd}% (Needs improvement!)`;
//         }
//     }

//     openAttendanceModal(subjectId) {
//         this.currentSubjectId = subjectId;
//         const subject = StorageManager.getSubject(subjectId);
//         document.getElementById('attendanceModalTitle').textContent = `Mark Attendance - ${subject.name}`;
//         document.getElementById('markAttendanceModal').style.display = 'block';
//     }

//     markAttendance(isPresent) {
//         if (!this.currentSubjectId) return;

//         StorageManager.updateAttendance(this.currentSubjectId, isPresent);
//         document.getElementById('markAttendanceModal').style.display = 'none';
        
//         this.renderSubjects();
//         this.updateOverallStats();
//         this.showNotification(isPresent);
//     }

//     undoAttendance() {
//         if (!this.currentSubjectId) return;

//         const subject = StorageManager.undoLastAttendance(this.currentSubjectId);
//         if (subject) {
//             document.getElementById('markAttendanceModal').style.display = 'none';
//             this.renderSubjects();
//             this.updateOverallStats();
//         }
//     }

//     deleteSubject(id) {
//         if (confirm('Are you sure you want to delete this subject?')) {
//             StorageManager.deleteSubject(id);
//             this.renderSubjects();
//             this.updateOverallStats();
//         }
//     }

//     checkSkip(subjectId) {
//         const subject = StorageManager.getSubject(subjectId);
//         if (subject.total === 0) {
//             this.displaySkipResult('No classes attended yet!', 'neutral');
//             return;
//         }

//         const currentPercentage = (subject.attended / subject.total) * 100;
//         const afterSkipPercentage = (subject.attended / (subject.total + 1)) * 100;
        
//         // Calculate safe skips
//         let safeSkips = 0;
//         let tempAttended = subject.attended;
//         let tempTotal = subject.total;
        
//         while (((tempAttended / (tempTotal + 1)) * 100) >= 75) {
//             safeSkips++;
//             tempTotal++;
//         }

//         const riskClass = this.getRiskClass(afterSkipPercentage);
        
//         let message = `
//             <div class="current-percentage color-${riskClass}">${currentPercentage.toFixed(1)}%</div>
//             <div class="skip-info">If you skip today: ${afterSkipPercentage.toFixed(1)}%</div>
//             <div class="safe-skips">${safeSkips} safe skips remaining</div>
//             <div class="status-indicator status-${riskClass}">
//                 ${riskClass === 'safe' ? '🟢 Safe to skip' : riskClass === 'caution' ? '🟡 Risky' : '🔴 Must attend'}
//             </div>
//         `;

//         this.displaySkipResult(message, riskClass);
//     }

//     displaySkipResult(message, riskClass) {
//         const skipResult = document.getElementById('skipResult');
//         skipResult.innerHTML = message;
//         skipResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
//     }

//     updateOverallStats() {
//         const subjects = StorageManager.getSubjects();
        
//         let totalClasses = 0;
//         let attendedClasses = 0;

//         subjects.forEach(subject => {
//             totalClasses += subject.total;
//             attendedClasses += subject.attended;
//         });

//         const overallPercentage = totalClasses > 0 ? ((attendedClasses / totalClasses) * 100).toFixed(1) : 0;

//         document.getElementById('overallPercentage').textContent = `${overallPercentage}%`;
//         document.getElementById('totalClasses').textContent = totalClasses;
//         document.getElementById('attendedClasses').textContent = attendedClasses;

//         // Update color
//         const percentageElement = document.getElementById('overallPercentage');
//         const riskClass = this.getRiskClass(overallPercentage);
//         percentageElement.className = `stat-value color-${riskClass}`;
//     }

//     showNotification(isPresent) {
//         // Request notification permission
//         if ('Notification' in window && Notification.permission === 'granted') {
//             const subjects = StorageManager.getSubjects();
//             const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
//             const totalClasses = subjects.reduce((sum, s) => sum + s.total, 0);
//             const percentage = ((totalAttended / totalClasses) * 100).toFixed(1);

//             new Notification('SkipSmart', {
//                 body: `Attendance marked! Overall: ${percentage}%`,
//                 icon: '📊'
//             });
//         } else if ('Notification' in window && Notification.permission !== 'denied') {
//             Notification.requestPermission();
//         }
//     }
// }

// // Initialize app
// const app = new SkipSmart();