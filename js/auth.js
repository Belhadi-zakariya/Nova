export class Auth {
  constructor() {
    this.currentUser = null;
    this.apiEndpoint = 'https://api.npoint.io/12ea0c58013bfe6a767e';
    this.setupEventListeners();
    
    // Try to restore session
    const savedSession = localStorage.getItem('current_session');
    if (savedSession) {
      this.currentUser = JSON.parse(savedSession);
      this.showMainContent(this.currentUser);
    }
  }

  async getUsers() {
    try {
      const response = await fetch(this.apiEndpoint);
      const users = await response.json();
      return Array.isArray(users) ? users : [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  async saveUsers(users) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(users)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save users');
      }
    } catch (error) {
      console.error('Error saving users:', error);
      throw error;
    }
  }

  async register(username, password) {
    const users = await this.getUsers();
    
    if (users.some(user => user.username === username)) {
      throw new Error('اسم المستخدم موجود بالفعل');
    }

    const newUser = {
      username,
      password,
      credits: 12,
      lastBonusDate: null
    };

    users.push(newUser);
    await this.saveUsers(users);
    
    this.currentUser = newUser;
    localStorage.setItem('current_session', JSON.stringify(newUser));
    
    return newUser;
  }

  async login(username, password) {
    const users = await this.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    }

    this.currentUser = user;
    localStorage.setItem('current_session', JSON.stringify(user));
    return user;
  }

  async updateUserCredits(username, newCredits) {
    const users = await this.getUsers();
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
      users[userIndex].credits = newCredits;
      await this.saveUsers(users);
      
      if (this.currentUser?.username === username) {
        this.currentUser.credits = newCredits;
        localStorage.setItem('current_session', JSON.stringify(this.currentUser));
      }
    }
  }

  async addDailyBonus() {
    if (!this.currentUser) return false;

    const lastBonus = this.currentUser.lastBonusDate ? new Date(this.currentUser.lastBonusDate) : null;
    const now = new Date();

    if (lastBonus) {
      const hoursSinceLastBonus = (now - lastBonus) / (1000 * 60 * 60);
      if (hoursSinceLastBonus < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastBonus);
        throw new Error(`يمكنك الحصول على المكافأة اليومية بعد ${hoursRemaining} ساعة`);
      }
    }

    const users = await this.getUsers();
    const userIndex = users.findIndex(u => u.username === this.currentUser.username);
    
    if (userIndex !== -1) {
      users[userIndex].credits += 2;
      users[userIndex].lastBonusDate = now.toISOString();
      await this.saveUsers(users);
      
      this.currentUser.credits += 2;
      this.currentUser.lastBonusDate = now.toISOString();
      localStorage.setItem('current_session', JSON.stringify(this.currentUser));
      
      return true;
    }
    
    return false;
  }

  canGetDailyBonus() {
    if (!this.currentUser || !this.currentUser.lastBonusDate) return true;
    
    const lastBonus = new Date(this.currentUser.lastBonusDate);
    const now = new Date();
    const hoursSinceLastBonus = (now - lastBonus) / (1000 * 60 * 60);
  
    return hoursSinceLastBonus >= 24;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('current_session');
  }

  setupEventListeners() {
    const signinTab = document.getElementById('signin-tab');
    const signupTab = document.getElementById('signup-tab');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const logoutButton = document.getElementById('logout-button');

    signinTab.addEventListener('click', () => {
      signinTab.classList.add('active');
      signupTab.classList.remove('active');
      signinForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
    });

    signupTab.addEventListener('click', () => {
      signupTab.classList.add('active');
      signinTab.classList.remove('active');
      signupForm.classList.remove('hidden');
      signinForm.classList.add('hidden');
    });

    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('signin-username').value;
      const password = document.getElementById('signin-password').value;

      try {
        const user = await this.login(username, password);
        this.showMainContent(user);
      } catch (error) {
        alert(error.message);
      }
    });

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('signup-username').value;
      const password = document.getElementById('signup-password').value;

      try {
        const user = await this.register(username, password);
        this.showMainContent(user);
      } catch (error) {
        alert(error.message);
      }
    });

    logoutButton.addEventListener('click', () => {
      this.logout();
      this.showAuthContent();
    });
  }

  showMainContent(user) {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    document.getElementById('user-credits').textContent = `الرصيد: ${user.credits}`;
  }

  showAuthContent() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('main-content').classList.add('hidden');
  }

  showDialog(message, type = 'alert') {
    return new Promise((resolve) => {
      const mainContent = document.getElementById('main-content');
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      
      // Store previously focused element
      const previousFocus = document.activeElement;
      
      const dialog = document.createElement('div');
      dialog.className = 'dialog-box';
      
      const content = document.createElement('div');
      content.className = 'dialog-content';
      
      const messageEl = document.createElement('div');
      messageEl.className = 'dialog-message';
      messageEl.textContent = message;
      
      const actions = document.createElement('div');
      actions.className = 'dialog-actions';
      
      content.appendChild(messageEl);
      dialog.appendChild(content);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      
      // Add inert to main content
      mainContent.setAttribute('inert', '');
      
      const closeDialog = (result) => {
        overlay.classList.remove('active');
        mainContent.removeAttribute('inert');
        setTimeout(() => {
          document.body.removeChild(overlay);
          // Restore focus
          previousFocus.focus();
          resolve(result);
        }, 300);
      };
      
      if (type === 'confirm') {
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'dialog-button primary';
        confirmBtn.textContent = 'نعم';
        confirmBtn.onclick = () => closeDialog(true);
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'dialog-button secondary';
        cancelBtn.textContent = 'إلغاء';
        cancelBtn.onclick = () => closeDialog(false);
        
        actions.appendChild(confirmBtn);
        actions.appendChild(cancelBtn);
        
        // Set initial focus to confirm button
        setTimeout(() => confirmBtn.focus(), 100);
      } else {
        const okBtn = document.createElement('button');
        okBtn.className = 'dialog-button primary';
        okBtn.textContent = 'حسناً';
        okBtn.onclick = () => closeDialog(true);
        
        actions.appendChild(okBtn);
        
        // Set initial focus to OK button
        setTimeout(() => okBtn.focus(), 100);
      }
      
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));
    });
  }
}

export const auth = new Auth();