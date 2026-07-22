// Logic for index.html
document.addEventListener('DOMContentLoaded', () => {
  const regForm = document.getElementById('registration-form');
  const regAlert = document.getElementById('reg-alert');
  const regSubmitBtn = document.getElementById('reg-submit-btn');

  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      regAlert.classList.add('hidden');
      regSubmitBtn.disabled = true;
      regSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Traitement...';

      const studentName = document.getElementById('reg-student-name').value.trim();
      const level = document.getElementById('reg-level').value;
      const parentName = document.getElementById('reg-parent-name').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const notes = document.getElementById('reg-notes').value.trim();

      try {
        // Check user limit rule for free plan (200 users max)
        const usersSnap = await window.db.collection('app_users')
          .where('projectId', '==', window.PROJECT_ID)
          .get();

        const totalUsers = usersSnap.size;

        // Check plan in Firestore settings
        const settingsDoc = await window.db.collection('app_data')
          .doc(window.PROJECT_ID + '_settings')
          .get();
        
        const isPro = settingsDoc.exists && settingsDoc.data().isPro === true;

        if (!isPro && totalUsers >= 200) {
          throw new Error('❌ Limite de 200 utilisateurs atteinte pour le plan gratuit. Le propriétaire du site doit souscrire au Plan PRO pour un nombre d\'utilisateurs illimité.');
        }

        const userNumber = totalUsers + 1;

        // Register in app_users
        await window.db.collection('app_users').add({
          projectId: window.PROJECT_ID,
          user_number: userNumber,
          email: email,
          name: studentName,
          parentName: parentName,
          phone: phone,
          level: level,
          role: 'student',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Register in app_data registrations
        await window.db.collection('app_data').add({
          projectId: window.PROJECT_ID,
          type: 'registration',
          studentName,
          level,
          parentName,
          phone,
          email,
          notes,
          status: 'En attente',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        regAlert.className = 'p-4 rounded-xl text-sm font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        regAlert.innerHTML = '🎉 Inscription enregistrée avec succès ! Un conseiller vous contactera sous peu.';
        regAlert.classList.remove('hidden');
        regForm.reset();
      } catch (err) {
        regAlert.className = 'p-4 rounded-xl text-sm font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30';
        regAlert.innerHTML = err.message || 'Une erreur est survenue lors de votre demande.';
        regAlert.classList.remove('hidden');
      } finally {
        regSubmitBtn.disabled = false;
        regSubmitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Envoyer ma candidature';
      }
    });
  }
});