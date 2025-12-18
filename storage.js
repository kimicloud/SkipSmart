// // Storage Manager - Handles all data persistence
// const StorageManager = {
//     // Get all subjects
//     getSubjects() {
//         const data = localStorage.getItem('skipsmart_subjects');
//         return data ? JSON.parse(data) : [];
//     },

//     // Save all subjects
//     saveSubjects(subjects) {
//         localStorage.setItem('skipsmart_subjects', JSON.stringify(subjects));
//     },

//     // Add new subject
//     addSubject(name) {
//         const subjects = this.getSubjects();
//         const newSubject = {
//             id: Date.now().toString(),
//             name: name,
//             attended: 0,
//             total: 0,
//             skipsUsed: 0,  // NEW: Track number of skips
//             currentStreak: 0,  // NEW: Current attendance streak
//             bestStreak: 0,  // NEW: Best streak ever
//             lastAttendedDate: null,  // NEW: Last class date
//             history: []
//         };
//         subjects.push(newSubject);
//         this.saveSubjects(subjects);
//         return newSubject;
//     },

//     // Delete subject
//     deleteSubject(id) {
//         let subjects = this.getSubjects();
//         subjects = subjects.filter(s => s.id !== id);
//         this.saveSubjects(subjects);
//     },

//     // Update subject attendance
//     updateAttendance(id, isPresent) {
//         const subjects = this.getSubjects();
//         const subject = subjects.find(s => s.id === id);
        
//         if (subject) {
//             subject.total++;
            
//             if (isPresent) {
//                 subject.attended++;
//                 subject.currentStreak++;
//                 subject.lastAttendedDate = new Date().toISOString();
                
//                 // Update best streak
//                 if (subject.currentStreak > subject.bestStreak) {
//                     subject.bestStreak = subject.currentStreak;
//                 }
//             } else {
//                 // Absent - reset streak and count skip
//                 subject.currentStreak = 0;
//                 subject.skipsUsed++;
//             }
            
//             // Add to history
//             subject.history.push({
//                 date: new Date().toISOString(),
//                 present: isPresent
//             });
            
//             this.saveSubjects(subjects);
//             return subject;
//         }
//         return null;
//     },

//     // Undo last attendance
//     undoLastAttendance(id) {
//         const subjects = this.getSubjects();
//         const subject = subjects.find(s => s.id === id);
        
//         if (subject && subject.history.length > 0) {
//             const lastEntry = subject.history.pop();
//             subject.total--;
            
//             if (lastEntry.present) {
//                 subject.attended--;
//                 subject.currentStreak = Math.max(0, subject.currentStreak - 1);
//             } else {
//                 subject.skipsUsed = Math.max(0, subject.skipsUsed - 1);
//             }
            
//             // Recalculate streak from history
//             this.recalculateStreak(subject);
            
//             this.saveSubjects(subjects);
//             return subject;
//         }
//         return null;
//     },

//     // Recalculate streak from history
//     recalculateStreak(subject) {
//         if (subject.history.length === 0) {
//             subject.currentStreak = 0;
//             return;
//         }

//         let streak = 0;
//         for (let i = subject.history.length - 1; i >= 0; i--) {
//             if (subject.history[i].present) {
//                 streak++;
//             } else {
//                 break;
//             }
//         }
//         subject.currentStreak = streak;
//     },

//     // Get subject by ID
//     getSubject(id) {
//         const subjects = this.getSubjects();
//         return subjects.find(s => s.id === id);
//     },

//     // Get days since last attendance
//     getDaysSinceLastAttendance(lastAttendedDate) {
//         if (!lastAttendedDate) return null;
        
//         const lastDate = new Date(lastAttendedDate);
//         const today = new Date();
//         const diffTime = Math.abs(today - lastDate);
//         const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
//         return diffDays;
//     }
// };