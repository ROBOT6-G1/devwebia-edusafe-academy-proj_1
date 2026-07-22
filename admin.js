// SHA-256 Utility for secure client-side PIN hashing comparison
async function hashPIN(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Default hash for initial PIN '123456'
const DEFAULT_PIN_HASH = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";

document.addEventListener('DOMContentLoaded', () => {
  const pinModal = document.getElementById('pin-modal');
  const pinForm = document.getElementById('pin-form');
  const pinInput = document.getElementById('admin-pin-input');
  const pinError = document.getElementById('pin-error');
  const dashboard = document.getElementById('admin-dashboard');

  // Check session
  if (sessionStorage.getItem('admin_authenticated') === 'true') {
    pinModal.classList.add('hidden');
    dashboard.classList.remove('hidden');
    loadDashboardData();
  }

  // PIN Verification
  pinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    pinError.classList.add('hidden');
    const enteredPin = pinInput.value.trim();
    const hashedInput = await hashPIN(enteredPin);

    try {
      // Fetch PIN hash stored in Firestore or fallback
      const settingsDoc = await window.db.collection('app_data')
        .doc(window.PROJECT_ID + '_settings')
        .get();

      let validHash = DEFAULT_PIN_HASH;
      if (settingsDoc.exists && settingsDoc.data().adminPinHash) {
        validHash = settingsDoc.data().adminPinHash;
      }

      if (hashedInput === validHash) {
        sessionStorage.setItem('admin_authenticated', 'true');
        pinModal.classList.add('hidden');
        dashboard.classList.remove('hidden');
        loadDashboardData();
      } else {
        pinError.textContent = '❌ Code PIN incorrect. Veuillez réespayer.';
        pinError.classList.remove('hidden');
      }
    } catch (err) {
      console.error(err);
      pinError.textContent = 'Erreur de connexion à la base de données.';
      pinError.classList.remove('hidden');
    }
  });

  // Change PIN form
  const changePinForm = document.getElementById('change-pin-form');
  if (changePinForm) {
    changePinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPin = document.getElementById('new-pin-input').value.trim();
      if (newPin.length < 4) {
        alert('Le code PIN doit contenir au moins 4 chiffres.');
        return;
      }
      const newHash = await hashPIN(newPin);
      await window.db.collection('app_data').doc(window.PROJECT_ID + '_settings').set({
        adminPinHash: newHash
      }, { merge: true });
      alert('✅ Code PIN mis à jour avec succès !');
      changePinForm.reset();
    });
  }

  // Add Teacher Form
  const addTeacherForm = document.getElementById('add-teacher-form');
  if (addTeacherForm) {
    addTeacherForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('teacher-name').value.trim();
      const subject = document.getElementById('teacher-subject').value.trim();
      const email = document.getElementById('teacher-email').value.trim();

      await window.db.collection('app_data').add({
        projectId: window.PROJECT_ID,
        type: 'teacher',
        name,
        subject,
        email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      toggleTeacherModal(false);
      addTeacherForm.reset();
      loadDashboardData();
    });
  }
});

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('bg-indigo-600', 'text-white');
    el.classList.add('hover:bg-slate-800', 'text-slate-300');
  });

  const activeTab = document.getElementById(`tab-${tabName}`);
  const activeBtn = document.getElementById(`tab-btn-${tabName}`);
  if (activeTab) activeTab.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.add('bg-indigo-600', 'text-white');
    activeBtn.classList.remove('hover:bg-slate-800', 'text-slate-300');
  }
}

function logout() {
  sessionStorage.removeItem('admin_authenticated');
  window.location.reload();
}

function toggleTeacherModal(show) {
  const modal = document.getElementById('teacher-modal');
  if (show) modal.classList.remove('hidden');
  else modal.classList.add('hidden');
}

async function loadDashboardData() {
  try {
    // Load app_users count
    const usersSnap = await window.db.collection('app_users')
      .where('projectId', '==', window.PROJECT_ID)
      .get();
    document.getElementById('stat-users').textContent = usersSnap.size;
    document.getElementById('users-count-stat').textContent = usersSnap.size;

    // Load registrations from app_data
    const regSnap = await window.db.collection('app_data')
      .where('projectId', '==', window.PROJECT_ID)
      .where('type', '==', 'registration')
      .get();
    document.getElementById('stat-registrations').textContent = regSnap.size;

    const recentTable = document.getElementById('recent-registrations-table');
    const allTable = document.getElementById('all-students-table');
    
    let tableHtml = '';
    regSnap.forEach(doc => {
      const data = doc.data();
      tableHtml += `
        <tr class="hover:bg-slate-50/50">
          <td class="p-3 font-semibold text-slate-900">${data.studentName || '-'}</td>
          <td class="p-3"><span class="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded">${data.level || '-'}</span></td>
          <td class="p-3 text-slate-600">${data.parentName || '-'}</td>
          <td class="p-3 text-slate-600">${data.phone || '-'}</td>
          <td class="p-3"><span class="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">${data.status || 'En attente'}</span></td>
        </tr>
      `;
    });
    recentTable.innerHTML = tableHtml || '<tr><td colspan="5" class="p-4 text-center text-slate-400">Aucune candidature.</td></tr>';
    if (allTable) allTable.innerHTML = tableHtml || '<tr><td colspan="5" class="p-4 text-center text-slate-400">Aucune candidature.</td></tr>';

    // Teachers list
    const teacherSnap = await window.db.collection('app_data')
      .where('projectId', '==', window.PROJECT_ID)
      .where('type', '==', 'teacher')
      .get();
    document.getElementById('stat-teachers').textContent = teacherSnap.size;

    const teacherGrid = document.getElementById('teachers-list-grid');
    let teacherHtml = '';
    teacherSnap.forEach(doc => {
      const t = doc.data();
      teacherHtml += `
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl">
            <i class="fa-solid fa-chalkboard-user"></i>
          </div>
          <div>
            <h4 class="font-bold text-slate-900">${t.name}</h4>
            <p class="text-xs text-indigo-600 font-semibold">${t.subject}</p>
            <p class="text-xs text-slate-400 mt-1">${t.email}</p>
          </div>
        </div>
      `;
    });
    if (teacherGrid) teacherGrid.innerHTML = teacherHtml || '<p class="text-slate-400 text-sm">Aucun professeur ajouté.</p>';

  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}