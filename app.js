// ============================================================
// app.js — منطق الشات بوت الصوتي (يعمل في المتصفح)
// ============================================================

const micBtn = document.getElementById("micBtn");
const micIcon = document.getElementById("micIcon");
const chatLog = document.getElementById("chatLog");
const statusText = document.getElementById("statusText");

// bot.php — InfinityFree تحظر chat.php في الروابط
const LANG = "ar-SA";
let isListening = false;

const healthUrl = new URL("bot.php", window.location.href);
healthUrl.searchParams.set("check", "1");

fetch(healthUrl, { credentials: "include" })
  .then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      statusText.textContent = "الخادم جاهز — اضغط على الميكروفون وابدأ الحديث";
      return;
    }
    if (res.status === 404) {
      statusText.textContent = "bot.php غير موجود — ارفعه داخل htdocs";
      return;
    }
    statusText.textContent = `تحذير: bot.php رجّع الحالة ${res.status}`;
  })
  .catch(() => {
    statusText.textContent = "تعذر الوصول إلى bot.php — تحقق من الرفع على InfinityFree";
  });

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognitionAPI) {
  statusText.textContent = "متصفحك لا يدعم التعرف على الصوت. جرّب Chrome أو Edge.";
  micBtn.disabled = true;
} else {
  const recognition = new SpeechRecognitionAPI();
  recognition.lang = LANG;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  micBtn.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
      return;
    }
    try {
      recognition.start();
    } catch (err) {
      console.error("تعذر بدء الاستماع:", err);
    }
  });

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    micIcon.textContent = "⏹️";
    statusText.textContent = "أستمع الآن... تحدّث بحرية";
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
    micIcon.textContent = "🎤";
    statusText.textContent = "اضغط على الميكروفون وابدأ الحديث";
  };

  recognition.onerror = (event) => {
    console.error("خطأ في التعرف على الصوت:", event.error);
    statusText.textContent = "لم أستطع سماعك، حاول مرة أخرى";
  };

  recognition.onresult = async (event) => {
    const userText = event.results[0][0].transcript;
    if (!userText) return;

    addMessage("user", userText);
    const thinkingEl = addMessage("bot", "...يفكر", { thinking: true });

    try {
      const reply = await askBot(userText);
      thinkingEl.remove();
      addMessage("bot", reply);
      speak(reply);
    } catch (err) {
      console.error(err);
      thinkingEl.remove();
      addMessage("bot", err.message || "حدث خطأ أثناء الاتصال بالخادم. حاول مجددًا.");
    }
  };
}

async function askBot(prompt) {
  const url = new URL("bot.php", window.location.href);
  url.searchParams.set("prompt", prompt);

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error || `فشل الطلب (${res.status})`;
    throw new Error(msg);
  }

  return data.reply || "لم يصل رد من الخادم.";
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG;
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

function addMessage(role, text, opts = {}) {
  const el = document.createElement("div");
  el.className = `message ${role}${opts.thinking ? " thinking" : ""}`;
  const p = document.createElement("p");
  p.textContent = text;
  el.appendChild(p);
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
  return el;
}
