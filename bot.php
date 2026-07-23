<?php
// bot.php — يستقبل النص من app.js ويستدعي Cohere API بأمان
// (GET متوافق مع InfinityFree — لا تستخدم chat.php لأن InfinityFree تحظر كلمة chat)

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && isset($_GET['check'])) {
    echo json_encode(['ok' => true]);
    exit;
}

$prompt = '';

if ($method === 'GET' && isset($_GET['prompt'])) {
    $prompt = trim($_GET['prompt']);
} elseif ($method === 'POST') {
    if (!empty($_POST['prompt'])) {
        $prompt = trim($_POST['prompt']);
    } else {
        $input = json_decode(file_get_contents('php://input'), true);
        $prompt = isset($input['prompt']) ? trim($input['prompt']) : '';
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'الطريقة غير مسموحة']);
    exit;
}

if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => 'الرجاء إرسال نص صالح في الحقل prompt']);
    exit;
}

if (!defined('COHERE_API_KEY') || COHERE_API_KEY === 'ضع_مفتاحك_هنا') {
    http_response_code(500);
    echo json_encode(['error' => 'لم يتم ضبط مفتاح Cohere في config.php بعد']);
    exit;
}

$url = 'https://api.cohere.com/v2/chat';

$body = json_encode([
    'model'    => 'command-r7b-12-2024',
    'messages' => [
        [
            'role'    => 'user',
            'content' => "أجب بالعربية باختصار:\n" . $prompt,
        ],
    ],
]);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . COHERE_API_KEY,
    ],
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_TIMEOUT        => 25,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'فشل الاتصال بـ Cohere API: ' . $curlErr]);
    exit;
}

$data = json_decode($response, true);

if ($httpCode >= 400) {
    http_response_code(502);
    $apiMsg = $data['message'] ?? ($data['error'] ?? 'خطأ غير معروف');

    if ($httpCode === 401) {
        $apiMsg = 'مفتاح Cohere غير صالح — تحقق من config.php';
    } elseif ($httpCode === 429) {
        $apiMsg = 'تجاوزت حد Cohere المجاني (1000 طلب/شهر) — انتظر أو أنشئ حسابًا جديدًا';
    }

    echo json_encode(['error' => $apiMsg], JSON_UNESCAPED_UNICODE);
    exit;
}

$reply = '';

if (isset($data['message']['content']) && is_array($data['message']['content'])) {
    foreach ($data['message']['content'] as $part) {
        if (isset($part['text'])) {
            $reply .= $part['text'];
        }
    }
}

if ($reply === '' && isset($data['text'])) {
    $reply = $data['text'];
}

if ($reply === '') {
    http_response_code(502);
    echo json_encode(['error' => 'تعذر الحصول على رد من Cohere']);
    exit;
}

echo json_encode(['reply' => trim($reply)], JSON_UNESCAPED_UNICODE);
