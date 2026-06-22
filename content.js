window.myFollowersList = [];
let isScanning = false;
window.cancelScan = false;

function checkCurrentTab(panel) {
    let url = window.location.href.toLowerCase();
    if (url.includes('/followers')) return 'followers';
    if (url.includes('/following')) return 'following';

    let activeTab = panel.querySelector('[aria-selected="true"]');
    if (activeTab) {
        let text = activeTab.textContent.toLowerCase();
        if (text.includes('takipçiler') || text.includes('followers')) return 'followers';
        if (text.includes('takip edilenler') || text.includes('following')) return 'following';
    }
    return 'unknown';
}

function isOwnProfilePage() {
    let path = window.location.pathname;
    if (!path.startsWith('/@') || path.includes('/post/')) return false;

    let buttons = Array.from(document.querySelectorAll('[role="button"], button, a'));
    let isOwn = buttons.some(btn => {
        let text = btn.textContent.trim().toLowerCase();
        return text === 'profili düzenle' || text === 'edit profile';
    });

    return isOwn;
}

function createDashboard() {
    if (document.getElementById('threads-pro-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'threads-pro-wrapper';
    wrapper.style.display = 'none'; 

    const dashboard = document.createElement('div');
    dashboard.id = 'threads-pro-dashboard';
    dashboard.style.cssText = `
        position: fixed;
        top: 75px; 
        right: 20px;
        width: 280px;
        background-color: rgba(26, 26, 26, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid #333; 
        border-radius: 12px;
        padding: 15px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.8);
        z-index: 999998;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #fff;
    `;

    dashboard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 10px;">
            <div style="font-weight: bold; font-size: 15px; color: #fff;">🔍 Threads Unfollower</div>
            <button id="tp-btn-minimize" style="background: none; border: none; color: #aaa; cursor: pointer; font-size: 14px; font-weight: bold; padding: 0 5px;" title="Paneli Gizle">➖</button>
        </div>
        <div id="tp-status" style="font-size: 12px; color: #00ffff; margin-bottom: 12px; text-align: center;">
            Durum: Takipçiler listesini açın
        </div>
        <div style="font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 15px; color: #00ff00;">
            <span id="tp-count">0</span> <span style="font-size: 12px; font-weight: normal; color: #888;">Takipçi Kaydedildi</span>
        </div>
        <button id="tp-btn-scan" style="width: 100%; background: #fff; color: #000; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;">
            Takipçileri Tara
        </button>
        <div style="font-size: 10px; color: #888; text-align: center; margin-top: 10px;">
            Not: 'Takip Edilenler' sekmesine geçtiğinizde geri takip etmeyenler otomatik tespit edilir.
        </div>
    `;

    const miniBubble = document.createElement('div');
    miniBubble.id = 'threads-pro-mini';
    miniBubble.title = "Threads Unfollower'ı Aç";
    miniBubble.style.cssText = `
        position: fixed;
        top: 75px; 
        right: 20px;
        width: 45px;
        height: 45px;
        background-color: rgba(26, 26, 26, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid #333;
        border-radius: 50%;
        display: none;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        z-index: 999999;
        font-size: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;
    miniBubble.innerHTML = '🔍';

    wrapper.appendChild(dashboard);
    wrapper.appendChild(miniBubble);
    document.body.appendChild(wrapper);

    document.getElementById('tp-btn-minimize').addEventListener('click', () => {
        dashboard.style.display = 'none';
        miniBubble.style.display = 'flex';
    });

    miniBubble.addEventListener('click', () => {
        dashboard.style.display = 'block';
        miniBubble.style.display = 'none';
    });

    document.getElementById('tp-btn-scan').addEventListener('click', startAutonomousScan);
}

async function startAutonomousScan() {
    if (isScanning) return;

    let openPanel = document.querySelector('[role="dialog"]');
    let statusText = document.getElementById('tp-status');
    let countText = document.getElementById('tp-count');

    if (!openPanel) return;

    if (checkCurrentTab(openPanel) !== 'followers') {
        statusText.innerText = "❌ Sadece 'Takipçiler' listesinde çalışır!";
        statusText.style.color = "#ff453a";
        return;
    }

    isScanning = true;
    window.cancelScan = false;
    window.myFollowersList = [];
    countText.innerText = "0";

    statusText.innerText = "⏳ Tarama Başladı...";
    statusText.style.color = "#ffcc00";

    let overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px);
        z-index: 9999999; display: flex; flex-direction: column;
        justify-content: center; align-items: center;
    `;
    overlay.innerHTML = `
        <div style="font-size: 50px; margin-bottom: 15px; animation: pulse 1s infinite;">⚙️</div>
        <div id="overlay-title" style="color: #00ffff; font-size: 18px; font-weight: bold;">Takipçiler Taranıyor...</div>
        <div id="overlay-count" style="color: #00ff00; font-size: 36px; font-weight: bold; margin-top: 10px;">0</div>
        <div id="overlay-desc" style="color: #aaa; font-size: 13px; margin-top: 10px; margin-bottom: 25px;">Lütfen taramanın bitmesini bekleyin veya işlemi iptal edin.</div>
        <button id="tp-btn-cancel" style="background: #ff453a; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;">İşlemi İptal Et ✖</button>
    `;
    document.body.appendChild(overlay);

    document.getElementById('tp-btn-cancel').addEventListener('click', () => {
        window.cancelScan = true;
    });

    let scrollContainer = Array.from(openPanel.querySelectorAll('div')).find(el => {
        let style = window.getComputedStyle(el);
        return style.overflowY === 'auto' || style.overflowY === 'scroll';
    }) || openPanel;

    let lastCount = 0;
    let noChangeCount = 0;

    for (let tur = 0; tur < 2500; tur++) {
        if (window.cancelScan) {
            statusText.innerText = "❌ Tarama İptal Edildi!";
            statusText.style.color = "#ff453a";
            break;
        }

        if (document.hidden) {
            document.getElementById('overlay-title').innerText = "⏸️ Tarama Duraklatıldı";
            document.getElementById('overlay-title').style.color = "#ffcc00";
            document.getElementById('overlay-desc').innerText = "Sekmeye geri döndüğünüzde işlem kaldığı yerden devam edecek...";
            statusText.innerText = "⏸️ Uyku Modu...";

            while (document.hidden) {
                await new Promise(r => setTimeout(r, 1000));
            }

            document.getElementById('overlay-title').innerText = "Takipçiler Taranıyor...";
            document.getElementById('overlay-title').style.color = "#00ffff";
            document.getElementById('overlay-desc').innerText = "Kaldığı yerden devam ediyor, lütfen bekleyin.";
            statusText.innerText = "⏳ Tarama Başladı...";
            
            lastCount = window.myFollowersList.length;
            noChangeCount = 0;
        }

        scrollContainer.scrollTop = scrollContainer.scrollHeight + 500;
        let allItems = openPanel.querySelectorAll('.x78zum5.x1q0g3np.x1493c5g.x1ypdohk.xnvo3vl') || openPanel.querySelectorAll('[role="listitem"]');
        if (allItems.length > 0) {
            allItems[allItems.length - 1].scrollIntoView({ block: 'end', behavior: 'auto' });
        }

        await new Promise(r => setTimeout(r, 50));
        scrollContainer.scrollTop -= 20;
        await new Promise(r => setTimeout(r, 50));
        scrollContainer.scrollTop += 50;

        await new Promise(r => setTimeout(r, 1500));

        let currentLinks = openPanel.querySelectorAll('a[href*="/@"]');
        currentLinks.forEach(link => {
            let hrefVal = link.getAttribute('href');
            if (hrefVal) {
                let username = hrefVal.replace('/@', '').split('?')[0].trim();
                if (username && username !== "undefined" && !window.myFollowersList.includes(username)) {
                    window.myFollowersList.push(username);
                }
            }
        });

        countText.innerText = window.myFollowersList.length;
        document.getElementById('overlay-count').innerText = window.myFollowersList.length;

        if (window.myFollowersList.length === lastCount) {
            noChangeCount++;
            if (noChangeCount > 4) break; 
        } else {
            noChangeCount = 0;
            lastCount = window.myFollowersList.length;
        }
    }

    scrollContainer.scrollTop = 0;
    overlay.remove();
    isScanning = false;

    if (!window.cancelScan) {
        statusText.innerText = "✅ Tarama Bitti!";
        statusText.style.color = "#00ff00";
    }
}

setInterval(() => {
    let openPanel = document.querySelector('[role="dialog"]');
    if (!openPanel || window.myFollowersList.length === 0) return;

    if (checkCurrentTab(openPanel) !== 'following') return;

    let rowSelector = '.x78zum5.x1q0g3np.x1493c5g.x1ypdohk.xnvo3vl';
    let rows = openPanel.querySelectorAll(rowSelector);

    rows.forEach(row => {
        let userLink = row.querySelector('a[href*="/@"]');
        if (!userLink) return;

        let username = userLink.getAttribute('href').replace('/@', '').split('?')[0].trim();
        
        if (!window.myFollowersList.includes(username) && !row.querySelector('.unfollow-custom-btn')) {
            let actionBtn = row.querySelector('[role="button"]');
            if (!actionBtn) return;

            let warningSpan = document.createElement('span');
            warningSpan.innerText = "Seni Takip Etmiyor";
            warningSpan.style.cssText = `
                color: #ff453a; 
                background-color: rgba(255, 69, 58, 0.1); 
                font-size: 12px; 
                font-weight: 600; 
                margin-left: auto !important;
                margin-right: 8px;
                padding: 4px 8px; 
                border-radius: 6px; 
                display: inline-flex; 
                align-items: center; 
                white-space: nowrap; 
                letter-spacing: -0.2px;
            `;

            let customBtn = document.createElement('button');
            customBtn.className = 'unfollow-custom-btn';
            customBtn.innerText = 'Takipten Çık';
            customBtn.style.cssText = `
                background-color: #ff453a; 
                color: #fff; 
                border: none; 
                border-radius: 8px; 
                padding: 6px 16px; 
                cursor: pointer; 
                font-weight: 600; 
                font-size: 13px; 
                margin-right: 12px !important;
                transition: all 0.2s ease; 
                white-space: nowrap; 
                display: inline-flex; 
                align-items: center; 
                justify-content: center; 
                min-width: 105px; 
                letter-spacing: -0.2px;
            `;

            function butonuSifirla() {
                customBtn.innerText = 'Takipten Çık';
                customBtn.style.backgroundColor = '#ff453a';
                customBtn.disabled = false;
                warningSpan.style.textDecoration = 'none';
                warningSpan.style.opacity = '1';
            }

            customBtn.onclick = function(e) {
                e.stopPropagation();
                customBtn.innerText = 'Bekleniyor...';
                customBtn.style.backgroundColor = '#555';
                
                let oldStatus = actionBtn.textContent.trim();
                actionBtn.click(); 

                let observer = new MutationObserver(() => {
                    let isPopupStillOpen = Array.from(document.querySelectorAll('button, [role="button"]')).some(b => 
                        b.textContent.trim() === 'Takibi Bırak' || b.textContent.trim() === 'İptal'
                    );
                    
                    if (!isPopupStillOpen) {
                        observer.disconnect(); 
                        setTimeout(() => {
                            let newStatus = actionBtn.textContent.trim();
                            if (newStatus !== oldStatus && (newStatus === 'Takip et' || newStatus === 'Follow')) {
                                customBtn.innerText = 'Çıkarıldı';
                                customBtn.disabled = true;
                                customBtn.style.backgroundColor = '#222';
                                warningSpan.style.textDecoration = 'line-through';
                                warningSpan.style.opacity = '0.5';
                            } else {
                                butonuSifirla();
                            }
                        }, 300);
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            };

            actionBtn.parentNode.insertBefore(warningSpan, actionBtn);
            actionBtn.parentNode.insertBefore(customBtn, actionBtn);
            
            actionBtn.style.setProperty('margin-left', '0', 'important');
        }
    });
}, 500);

setInterval(() => {
    let wrapper = document.getElementById('threads-pro-wrapper');
    let ownProfile = isOwnProfilePage(); 

    if (!wrapper && ownProfile) {
        createDashboard();
        wrapper = document.getElementById('threads-pro-wrapper');
    }

    if (wrapper) {
        if (ownProfile) {
            if (wrapper.style.display === 'none') {
                wrapper.style.display = 'block';
            }
        } else {
            wrapper.style.display = 'none';
        }
    }
}, 1000);