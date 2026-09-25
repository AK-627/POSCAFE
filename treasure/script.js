/* ============================================
   TREASURE HUNT — FINAL LOCK
   All game logic — no external dependencies
   ============================================ */

(function () {
  'use strict';

  // ──────────────────────────────────────────
  // ✏️  TO CHANGE THE CODE:
  //     1. Open a browser console (F12)
  //     2. Run this command (replace YOURNEWCODE):
  //        crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOURNEWCODE')).then(h => console.log([...new Uint8Array(h)].map(b => b.toString(16).padStart(2,'0')).join('')))
  //     3. Copy the hex string it prints
  //     4. Paste it below as the new CORRECT_HASH
  // ──────────────────────────────────────────
  var CORRECT_HASH = 'c643d64c02106a8d199d24ffd614a1e68d59105668e77cd592707110a7579965';
  // ──────────────────────────────────────────

  // --- SHA-256 helper (uses built-in browser crypto) ---
  async function sha256(text) {
    var data = new TextEncoder().encode(text);
    var hashBuffer = await crypto.subtle.digest('SHA-256', data);
    var hashArray = new Uint8Array(hashBuffer);
    var hex = '';
    for (var i = 0; i < hashArray.length; i++) {
      hex += hashArray[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  // --- DOM refs ---
  var screenLanding = document.getElementById('screen-landing');
  var screenCode    = document.getElementById('screen-code');
  var screenSuccess = document.getElementById('screen-success');
  var btnStart      = document.getElementById('btn-start');
  var btnSubmit     = document.getElementById('btn-submit');
  var feedback      = document.getElementById('feedback');
  var codeBoxes     = document.querySelectorAll('.code-box');

  // --- Screen transition helper ---
  function switchScreen(from, to) {
    from.classList.add('fade-out');
    setTimeout(function () {
      from.classList.remove('active', 'fade-out');
      to.classList.add('active', 'fade-in');
      setTimeout(function () {
        to.classList.remove('fade-in');
      }, 400);
    }, 300);
  }

  // --- START button ---
  btnStart.addEventListener('click', function () {
    switchScreen(screenLanding, screenCode);
    setTimeout(function () {
      codeBoxes[0].focus();
    }, 350);
  });

  // --- Input box behavior ---
  codeBoxes.forEach(function (box, index) {

    // Filter to A-Z only, auto-uppercase
    box.addEventListener('input', function () {
      var val = box.value.replace(/[^a-zA-Z]/g, '');
      box.value = val.toUpperCase();

      // Clear error styling
      box.classList.remove('error');
      feedback.textContent = '';
      feedback.className = 'feedback';

      if (val.length === 1) {
        box.classList.add('filled');
        if (index < codeBoxes.length - 1) {
          codeBoxes[index + 1].focus();
        }
      } else {
        box.classList.remove('filled');
      }
    });

    // Handle backspace navigation
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && box.value === '' && index > 0) {
        codeBoxes[index - 1].focus();
        codeBoxes[index - 1].value = '';
        codeBoxes[index - 1].classList.remove('filled');
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        btnSubmit.click();
      }
    });

    // Select all text on focus for easy overwrite
    box.addEventListener('focus', function () {
      box.select();
    });

    // Distribute pasted text across boxes
    box.addEventListener('paste', function (e) {
      e.preventDefault();
      var pasted = (e.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase();
      for (var i = 0; i < pasted.length && (index + i) < codeBoxes.length; i++) {
        codeBoxes[index + i].value = pasted[i];
        codeBoxes[index + i].classList.add('filled');
        codeBoxes[index + i].classList.remove('error');
      }
      var nextIndex = Math.min(index + pasted.length, codeBoxes.length - 1);
      codeBoxes[nextIndex].focus();
    });
  });

  // --- SUBMIT (async to allow hash comparison) ---
  btnSubmit.addEventListener('click', async function () {
    // Gather the code
    var entered = '';
    for (var i = 0; i < codeBoxes.length; i++) {
      entered += codeBoxes[i].value;
    }

    // Check all 5 letters are filled
    if (entered.length < 5) {
      feedback.textContent = 'Enter all 5 letters';
      feedback.className = 'feedback wrong';
      codeBoxes.forEach(function (b) {
        if (b.value === '') b.classList.add('error');
      });
      return;
    }

    // Compare hash instead of plain text
    var enteredHash = await sha256(entered);

    if (enteredHash === CORRECT_HASH) {
      feedback.textContent = '✅ CODE ACCEPTED';
      feedback.className = 'feedback correct';
      btnSubmit.disabled = true;
      setTimeout(function () {
        switchScreen(screenCode, screenSuccess);
      }, 800);
    } else {
      feedback.textContent = '❌ WRONG CODE';
      feedback.className = 'feedback wrong';
      codeBoxes.forEach(function (b) {
        b.classList.add('error');
      });
      setTimeout(function () {
        codeBoxes.forEach(function (b) {
          b.value = '';
          b.classList.remove('error', 'filled');
        });
        codeBoxes[0].focus();
      }, 900);
    }
  });

})();
