import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

(async () => {
  console.log('🚀 Starting EventFlow Automated Demo Video script (Logout/Login flow)...');

  // Launch browser in non-headless (visible) mode with slowMo to make it look smooth and professional
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1400 // Wait 1.4s between steps so viewers can follow the flow easily
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Set viewport to standard 720p HD resolution for high quality recording
  await page.setViewportSize({ width: 1280, height: 720 });
  
  // Dialog listener: Automatically accept any browser alerts/confirm dialogs so the script never hangs
  page.on('dialog', async dialog => {
    console.log(`💬 Dialog popped up: [${dialog.type()}] "${dialog.message()}" - Automatically accepting.`);
    await dialog.accept();
  });

  try {
    // 1. Open home page
    let targetUrl = 'http://localhost:5173';
    console.log('🔍 Checking which server port is active...');
    try {
      const checkResponse = await page.goto('http://localhost:5173', { timeout: 3000 }).catch(() => null);
      if (!checkResponse) {
        console.log('⚠️ Development server on port 5173 is not responding. Trying production server on port 5000...');
        targetUrl = 'http://localhost:5000';
        await page.goto('http://localhost:5000', { timeout: 10000 });
      }
    } catch (err) {
      console.log('⚠️ Failed to connect to port 5173. Falling back to port 5000...');
      targetUrl = 'http://localhost:5000';
      await page.goto('http://localhost:5000', { timeout: 10000 });
    }
    
    console.log(`🌐 Connected successfully to EventFlow at ${targetUrl}`);
    await page.waitForTimeout(2000);

    // ==========================================
    // STEP 1: LOGIN AS SECRETARY
    // ==========================================
    console.log('🔑 Logging in as Secretary...');
    await page.fill('input[type="email"]', 'office@eventflow.co.il');
    await page.fill('input[type="password"]', 'admin123');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2500);

    // ==========================================
    // STEP 1.5: ROBUST RABBI EXISTENCE CHECK
    // ==========================================
    console.log('🔍 Checking if Rabbi Avraham Cohen exists in the database...');
    // Click schedule to temporarily open the form and inspect select options
    await page.click('button:has-text("שיבוץ אירוע חדש")');
    await page.waitForTimeout(1000);
    
    const rabbiExists = await page.evaluate(() => {
      const select = document.querySelector('select');
      if (!select) return false;
      return Array.from(select.options).some(opt => opt.text.includes('הרב אברהם כהן'));
    });
    
    // Close create modal
    await page.click('.modal-content button:has-text("✕")');
    await page.waitForTimeout(1000);

    if (!rabbiExists) {
      console.log('👤 Rabbi Avraham Cohen is missing. Registering him automatically first...');
      await page.click('button:has-text("ניהול רבנים")');
      await page.waitForTimeout(1000);
      
      await page.click('button:has-text("הוסף רב חדש")');
      await page.waitForTimeout(1000);
      
      await page.fill('input[placeholder="שם הרב"]', 'הרב אברהם כהן');
      await page.fill('input[placeholder="email@example.com"]', 'rabbi.avraham@gmail.com');
      await page.fill('input[placeholder="050-0000000"]', '050-1234567');
      await page.fill('input[placeholder="כתובת מלאה (רחוב, עיר)"]', 'רחוב השל"ה 4, בני ברק');
      await page.fill('input[placeholder="מינימום 6 תווים"]', '123456');
      await page.waitForTimeout(1500);
      
      await page.click('button:has-text("שמור רב חדש")');
      await page.waitForTimeout(2000);
      
      await page.click('button:has-text("סגור")');
      await page.waitForTimeout(1500);
    } else {
      console.log('✅ Rabbi Avraham Cohen is already in the database.');
    }

    // ==========================================
    // STEP 2: SCHEDULE AN EVENT
    // ==========================================
    console.log('📅 Fetching simulated clock time to calculate future date...');
    let simTime = new Date();
    try {
      const apiBase = targetUrl.includes('5173') ? 'http://localhost:5000' : targetUrl;
      const res = await fetch(`${apiBase}/api/time`);
      const data = await res.json();
      if (data && data.simulatedTime) {
        simTime = new Date(data.simulatedTime);
        console.log(`🕒 Server simulated time is: ${simTime.toLocaleString()}`);
      }
    } catch (e) {
      console.log('⚠️ Failed to fetch simulated time from API, defaulting to host system time.');
    }

    console.log('📅 Scheduling a new event...');
    await page.click('button:has-text("שיבוץ אירוע חדש")');
    await page.waitForTimeout(1000);
    
    // Fill event details
    await page.fill('input[placeholder="לדוגמא: שיעור תורה וערב הפרשת חלה"]', 'חוג בית - חיזוק קהילתי');
    
    // Set event date to exactly 1 day after simulated clock time
    const eventDate = new Date(simTime);
    eventDate.setDate(eventDate.getDate() + 1);
    const tomorrowStr = eventDate.toISOString().split('T')[0];
    console.log(`📅 Scheduling event date to: ${tomorrowStr}`);
    await page.fill('input[type="date"]', tomorrowStr);
    await page.fill('input[type="time"]', '19:00');
    
    // Select Rabbi
    await page.selectOption('select', { label: 'הרב אברהם כהן' });
    await page.waitForTimeout(500);
    
    await page.fill('input[placeholder=\'שם האולם, בית כנסת או מתנ"ס\']', 'אולמי פרימיום, ירושלים');
    await page.fill('input[placeholder="שם מלא"]', 'משה כהן');
    await page.fill('input[placeholder="מספר טלפון"]', '054-9876543');
    await page.fill('textarea[placeholder="דגשים טכניים, בקשות מיוחדות של הלקוח וכדומה..."]', 'אירוע חיזוק קהילתי בשיתוף מורשת רשב"י');
    await page.waitForTimeout(1500);
    
    // Submit event
    await page.click('button:has-text("שבץ אירוע ושלח הודעה לרב")');
    await page.waitForTimeout(2500);

    // ==========================================
    // STEP 3: LOG OUT AS SECRETARY
    // ==========================================
    console.log('🚪 Logging out as Secretary...');
    await page.click('button:has-text("יציאה")');
    await page.waitForTimeout(2000);

    // ==========================================
    // STEP 4: LOG IN AS RABBI (STANDARD CREDENTIALS)
    // ==========================================
    console.log('🔑 Logging in as Rabbi...');
    await page.fill('input[type="email"]', 'rabbi.avraham@gmail.com');
    await page.fill('input[type="password"]', '123456');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // ==========================================
    // STEP 5: RABBI APPROVES EVENT
    // ==========================================
    console.log('✓ Rabbi approving event on Rabbi Dashboard...');
    await page.waitForSelector('.glass-card:has-text("הזמנות לאירועים חדשים") button:has-text("✓ אשר")', { timeout: 5000 });
    await page.click('.glass-card:has-text("הזמנות לאירועים חדשים") button:has-text("✓ אשר")');
    await page.waitForTimeout(3000);

    // ==========================================
    // STEP 6: TIME TRAVEL (ADVANCE TIME TO END EVENT)
    // ==========================================
    console.log('⏰ Advancing time to 24 hours before the event...');
    await page.click('button:has-text("יום אחד")'); // Add 1 day
    await page.waitForTimeout(4000);

    console.log('⏰ Advancing time to after the event ends...');
    await page.click('button:has-text("יום אחד")'); // Add another day (past event end + 2 hours)
    await page.waitForTimeout(4000);

    // ==========================================
    // STEP 7: RABBI FILLS REPORT
    // ==========================================
    console.log('✍️ Opening report questionnaire from simulator...');
    await page.waitForSelector('.simulator-panel .btn-primary:has-text("✍️ מלא דוח סיכום")', { timeout: 5000 });
    await page.click('.simulator-panel .btn-primary:has-text("✍️ מלא דוח סיכום")');
    await page.waitForTimeout(2000);

    console.log('📝 Filling report details...');
    await page.waitForSelector('input[placeholder="כמות נוכחים מוערכת"]', { timeout: 5000 });
    await page.fill('input[placeholder="כמות נוכחים מוערכת"]', '65');
    
    // Check checkboxes
    await page.click('label[for="connectedRashbi"]');
    await page.waitForTimeout(300);
    
    // Fill folders
    await page.locator('div.form-group:has-text("פולדרים תקינים (מלאים)") >> input').fill('15');
    await page.locator('div.form-group:has-text("פולדרים חסרי פרטים") >> input').fill('0');
    
    // Fill forms and interested counts
    await page.fill('input[placeholder="כמות שנאספה"]', '40');
    await page.locator('div.form-group:has-text("מתעניינים בעריכת אירוע") >> input').fill('5');
    
    await page.click('label[for="formsChecked"]');
    await page.waitForTimeout(300);
    
    // Donations total
    await page.fill('input[placeholder="סך הכל שווי התחייבויות חודשיות בש״ח"]', '1800');
    
    // Comments
    await page.fill('textarea[placeholder="הערות נוספות, חוויות מהאירוע, סיכום..."]', 'היה אירוע מוצלח ומלא התעוררות, המשתתפים שמחו לקבל את פולדר רשב"י.');
    await page.waitForTimeout(2500);

    // Submit report
    await page.click('button:has-text("הגש דוח סופי למזכירות")');
    await page.waitForTimeout(3500);

    // ==========================================
    // STEP 8: LOG OUT AS RABBI
    // ==========================================
    console.log('🚪 Logging out as Rabbi...');
    await page.click('button:has-text("יציאה")');
    await page.waitForTimeout(2000);

    // ==========================================
    // STEP 9: LOG IN BACK AS SECRETARY
    // ==========================================
    console.log('🔑 Logging back in as Secretary...');
    await page.fill('input[type="email"]', 'office@eventflow.co.il');
    await page.fill('input[type="password"]', 'admin123');
    await page.waitForTimeout(500);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // ==========================================
    // STEP 10: VIEW SUBMITTED REPORT AND FINISH
    // ==========================================
    console.log('📊 Viewing submitted report in Secretary panel...');
    await page.waitForSelector('.glass-card:has-text("דוחות סיכום שהוגשו") button:has-text("צפה בפרטים המלאים")', { timeout: 5000 });
    await page.click('.glass-card:has-text("דוחות סיכום שהוגשו") button:has-text("צפה בפרטים המלאים")');
    await page.waitForTimeout(4000);

    // Close modal
    await page.click('.modal-content button:has-text("סגור")');
    await page.waitForTimeout(1500);

    // Hide simulator
    console.log('✨ Hiding Simulator for final presentation...');
    await page.click('button:has-text("הסתר סימולטור")');
    await page.waitForTimeout(5000);

    console.log('🎉 Playwright simulation successfully completed!');
    
  } catch (err) {
    console.error('❌ Error during Playwright execution:', err);
    try {
      writeFileSync('demo_error.txt', err.stack || err.toString());
      console.log('📄 Full error stack saved to demo_error.txt');
    } catch (fsErr) {
      console.error('Failed to write demo_error.txt:', fsErr);
    }
  } finally {
    await browser.close();
  }
})();
