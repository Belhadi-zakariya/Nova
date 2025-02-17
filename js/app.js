import { auth } from './auth.js';

async function fetchTools() {
  try {
    const response = await fetch('https://api.npoint.io/e91f40fae93408bdc224');
    const data = await response.json();
    displayTools(Array.isArray(data) ? data : [data]);
  } catch (error) {
    console.error('Error fetching tools:', error);
    document.getElementById('tools-container').innerHTML = `
      <div class="error-message" role="alert">
        عذراً، حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى لاحقاً.
      </div>
    `;
  }
}

function displayTools(tools) {
  const container = document.getElementById('tools-container');
  
  const toolsHTML = tools.map((tool, index) => `
    <button 
      class="tool-card" 
      onclick="window.open('${tool.url}', '_blank', 'noopener,noreferrer')"
      aria-label="${tool.toolname} - ${tool.description} - ${tool.credits === 0 ? 'مجاني' : `${tool.credits} رصيد`}"
      style="--index: ${index}">
      <div class="tool-icon">
        ${getToolIcon()}
      </div>
      <div class="tool-content">
        <h2 class="tool-name">${tool.toolname}</h2>
        <p class="tool-description">${tool.description}</p>
        <span class="tool-credits ${tool.credits === 0 ? 'free' : 'paid'}" aria-hidden="true">
          ${tool.credits === 0 ? 'مجاني' : `${tool.credits} رصيد`}
        </span>
      </div>
      <div class="tool-arrow">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </button>
  `).join('');
  
  container.innerHTML = toolsHTML;
}

function getToolIcon() {
  return `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>`;
}

function initializeMenu() {
  const menuButton = document.querySelector('#menu-button');
  const dropdownMenu = document.querySelector('#dropdown-menu');
  const mainContent = document.getElementById('main-content');
  const getDailyBonusButton = document.querySelector('#get-daily-bonus');
  const logoutButton = document.querySelector('#logout-button');
  
  let menuItems = [getDailyBonusButton, logoutButton];
  let currentFocusIndex = -1;

  // Toggle menu on button click
  menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = dropdownMenu.classList.contains('show');
    dropdownMenu.classList.toggle('show');
    menuButton.setAttribute('aria-expanded', !isExpanded);
    
    if (!isExpanded) {
      // When opening menu
      mainContent.setAttribute('aria-hidden', 'true');
      dropdownMenu.removeAttribute('aria-hidden');
      // Focus first menu item
      currentFocusIndex = 0;
      menuItems[currentFocusIndex].focus();
    } else {
      // When closing menu
      closeMenu();
    }
  });

  function closeMenu() {
    dropdownMenu.classList.remove('show');
    menuButton.setAttribute('aria-expanded', 'false');
    mainContent.removeAttribute('aria-hidden');
    dropdownMenu.setAttribute('aria-hidden', 'true');
    menuButton.focus();
    currentFocusIndex = -1;
  }
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target) && !menuButton.contains(e.target)) {
      closeMenu();
    }
  });
  
  // Handle keyboard navigation
  dropdownMenu.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        currentFocusIndex = Math.min(currentFocusIndex + 1, menuItems.length - 1);
        menuItems[currentFocusIndex].focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        currentFocusIndex = Math.max(currentFocusIndex - 1, 0);
        menuItems[currentFocusIndex].focus();
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;
    }
  });

  // Handle daily bonus click
  getDailyBonusButton.addEventListener('click', async () => {
    try {
      if (!auth.canGetDailyBonus()) {
        const lastBonus = new Date(auth.currentUser.lastBonusDate);
        const nextBonus = new Date(lastBonus.getTime() + 24 * 60 * 60 * 1000);
        const timeRemaining = nextBonus - new Date();
        const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
        
        await auth.showDialog(`يمكنك الحصول على المكافأة اليومية بعد ${hoursRemaining} ساعة`);
        return;
      }
      
      const success = await auth.addDailyBonus();
      if (success) {
        await auth.showDialog('تم إضافة مكافأتك اليومية: نقطتان!');
        updateCreditsDisplay();
      }
    } catch (error) {
      await auth.showDialog(error.message);
    }
    dropdownMenu.classList.remove('show');
  });
}

function updateCreditsDisplay() {
  const creditsElement = document.getElementById('user-credits');
  if (creditsElement && auth.currentUser) {
    const credits = auth.currentUser.credits;
    creditsElement.textContent = `الرصيد: ${credits}`;
    creditsElement.setAttribute('aria-label', creditsElement.textContent);
    
    const canGetBonus = auth.canGetDailyBonus();
    if (canGetBonus) {
      creditsElement.classList.add('bonus-available');
      creditsElement.setAttribute('aria-label', `لديك ${credits} نقطة - انقر للحصول على المكافأة اليومية`);
    } else {
      creditsElement.classList.remove('bonus-available');
    }
  }
}

function showDialog(message, options = {}) {
  return new Promise((resolve) => {
    const mainContent = document.getElementById('main-content');
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'dialog-message');
    
    const previousFocus = document.activeElement;
    
    const dialog = document.createElement('div');
    dialog.className = 'dialog-box';
    
    const content = document.createElement('div');
    content.className = 'dialog-content';
    
    const messageEl = document.createElement('div');
    messageEl.id = 'dialog-message';
    messageEl.className = 'dialog-message';
    messageEl.textContent = message;
    
    const actions = document.createElement('div');
    actions.className = 'dialog-actions';
    
    content.appendChild(messageEl);
    dialog.appendChild(content);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);
    
    // Hide main content from screen readers
    mainContent.setAttribute('aria-hidden', 'true');
    
    const buttons = [];
    
    const closeDialog = (result) => {
      overlay.classList.remove('active');
      mainContent.removeAttribute('aria-hidden');
      
      setTimeout(() => {
        document.body.removeChild(overlay);
        previousFocus.focus();
        resolve(result);
      }, 300);
    };
    
    if (options.type === 'confirm') {
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'dialog-button primary';
      confirmBtn.textContent = 'نعم';
      confirmBtn.onclick = () => closeDialog(true);
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'dialog-button secondary';
      cancelBtn.textContent = 'إلغاء';
      cancelBtn.onclick = () => closeDialog(false);
      
      buttons.push(confirmBtn, cancelBtn);
      actions.appendChild(confirmBtn);
      actions.appendChild(cancelBtn);
    } else {
      const okBtn = document.createElement('button');
      okBtn.className = 'dialog-button primary';
      okBtn.textContent = 'حسناً';
      okBtn.onclick = () => closeDialog(true);
      
      buttons.push(okBtn);
      actions.appendChild(okBtn);
    }
    
    // Handle keyboard navigation
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDialog(false);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = buttons.indexOf(document.activeElement);
        let nextIndex;
        if (e.shiftKey) {
          nextIndex = currentIndex === 0 ? buttons.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex === buttons.length - 1 ? 0 : currentIndex + 1;
        }
        buttons[nextIndex].focus();
      }
    });
    
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      buttons[0].focus();
    });
  });
}

auth.showDialog = showDialog;

// Override the original showMainContent to initialize menu
const originalShowMainContent = auth.showMainContent.bind(auth);
auth.showMainContent = function(user) {
  originalShowMainContent(user);
  updateCreditsDisplay();
  initializeMenu();
};

// Show loading state
document.getElementById('tools-container').innerHTML = `
  <div class="tool-card loading" aria-hidden="true">
    <div class="tool-name">جاري التحميل...</div>
    <div class="tool-description">يرجى الانتظار</div>
  </div>
`.repeat(3);

// Load tools when the page loads
document.addEventListener('DOMContentLoaded', () => {
  fetchTools();
  if (auth.currentUser) {
    initializeMenu();
  }
});