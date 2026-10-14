import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderMarkdown,
  getEditorContext,
  parseSSEChunk,
  buildSystemPrompt,
  escapeHtml,
  SUGGESTION_CHIPS,
  CHAT_CONFIG,
  MascotChat
} from '../js/ui/mascotChat.js';

test('CHAT_CONFIG has required endpoint and model', () => {
  assert.equal(CHAT_CONFIG.workerUrl, 'https://crimson-glade-8f31.rahmatullin-ilnur-17021992.workers.dev/api/chat');
  assert.equal(CHAT_CONFIG.model, 'qwen/qwen3.8-27b');
});

test('SUGGESTION_CHIPS contains all 4 standard prompts', () => {
  assert.equal(SUGGESTION_CHIPS.length, 4);
  const labels = SUGGESTION_CHIPS.map(c => c.label);
  assert.ok(labels.includes('💡 Объясни код'));
  assert.ok(labels.includes('🐞 В чём ошибка?'));
  assert.ok(labels.includes('🚀 Как улучшить код?'));
  assert.ok(labels.includes('✨ Дай совет'));
});

test('escapeHtml properly sanitizes dangerous characters', () => {
  assert.equal(escapeHtml('<script>alert("1") & \'test\'</script>'), '&lt;script&gt;alert(&quot;1&quot;) &amp; &#039;test&#039;&lt;/script&gt;');
  assert.equal(escapeHtml(''), '');
  assert.equal(escapeHtml(null), '');
});

test('renderMarkdown handles basic formatting', () => {
  const input = 'Привет! Это **жирный текст** и `inline_code`.';
  const html = renderMarkdown(input);
  assert.ok(html.includes('<strong>жирный текст</strong>'));
  assert.ok(html.includes('<code>inline_code</code>'));
});

test('renderMarkdown escapes HTML to prevent XSS', () => {
  const input = '<script>alert("xss")</script>';
  const html = renderMarkdown(input);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('renderMarkdown renders python code block with pre, code, and copy button', () => {
  const input = 'Вот решение:\n```python\nprint("hello world")\n```\nПопробуй запустить!';
  const html = renderMarkdown(input);
  assert.ok(html.includes('class="mascot-code-block"'));
  assert.ok(html.includes('class="mascot-code-copy-btn"'));
  assert.ok(html.includes('Копировать'));
  assert.ok(html.includes('<code class="language-python">'));
  assert.ok(html.includes('print(&quot;hello world&quot;)') || html.includes('print("hello world")'));
});

test('renderMarkdown renders bullet lists', () => {
  const input = 'Пункты:\n* Первый\n* Второй';
  const html = renderMarkdown(input);
  assert.ok(html.includes('<ul>'));
  assert.ok(html.includes('<li>Первый</li>'));
  assert.ok(html.includes('<li>Второй</li>'));
});

test('renderMarkdown handles empty or null input gracefully', () => {
  assert.equal(renderMarkdown(''), '');
  assert.equal(renderMarkdown(null), '');
});

test('parseSSEChunk parses delta content', () => {
  const line = 'data: {"id":"123","choices":[{"index":0,"delta":{"content":"Привет!"}}]}';
  const res = parseSSEChunk(line);
  assert.equal(res.content, 'Привет!');
  assert.equal(res.done, false);
});

test('parseSSEChunk handles [DONE]', () => {
  const line = 'data: [DONE]';
  const res = parseSSEChunk(line);
  assert.equal(res.done, true);
});

test('parseSSEChunk handles malformed lines gracefully', () => {
  assert.deepEqual(parseSSEChunk(''), { done: false, content: '' });
  assert.deepEqual(parseSSEChunk('random text'), { done: false, content: '' });
  assert.deepEqual(parseSSEChunk('data: {invalid json'), { done: false, content: '' });
});

test('buildSystemPrompt includes topic, code, and error context', () => {
  const context = {
    topic: 'Списки и кортежи',
    code: 'nums = [1, 2, 3]\nprint(nums[10])',
    error: 'IndexError: list index out of range'
  };
  const prompt = buildSystemPrompt(context);
  assert.ok(prompt.includes('Snake'));
  assert.ok(prompt.includes('Списки и кортежи'));
  assert.ok(prompt.includes('nums = [1, 2, 3]'));
  assert.ok(prompt.includes('IndexError: list index out of range'));
  assert.ok(prompt.includes('Никогда не повторяй приветствие'));
});

test('buildSystemPrompt clarifies that user is on catalog page when topic is Главная страница / Справочник', () => {
  const context = {
    topic: 'Главная страница / Справочник',
    code: '',
    error: ''
  };
  const prompt = buildSystemPrompt(context);
  assert.ok(prompt.includes('главной странице'));
  assert.ok(!prompt.includes('Текущая тема занятия: "Главная страница / Справочник"'));
});

test('getEditorContext falls back to defaults when DOM is missing', () => {
  const ctx = getEditorContext();
  assert.equal(ctx.topic, 'Python');
  assert.equal(ctx.code, '');
  assert.equal(ctx.error, '');
});

test('MascotChat state management and callbacks', () => {
  const chat = new MascotChat();
  const states = [];
  chat.onStateChange = (st) => states.push(st);

  assert.equal(chat.isOpen(), false);
  chat.notifyState('open');
  assert.deepEqual(states, ['open']);
  chat.notifyState('typing');
  chat.notifyState('done');
  assert.deepEqual(states, ['open', 'typing', 'done']);
});

test('MascotChat builds API payload with message, context, history, and messages', async () => {
  const chat = new MascotChat();
  let capturedPayload = null;

  // Mock fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    capturedPayload = JSON.parse(opts.body);
    return {
      ok: true,
      body: {
        getReader() {
          return {
            async read() {
              return { done: true, value: undefined };
            }
          };
        }
      }
    };
  };

  try {
    chat.history = [{ role: 'assistant', content: 'Привет!' }];
    await chat.sendMessage('Объясни списки');

    assert.ok(capturedPayload, 'Payload must be sent');
    assert.equal(capturedPayload.message, 'Объясни списки');
    assert.ok(capturedPayload.context);
    assert.ok(Array.isArray(capturedPayload.history));
    assert.ok(Array.isArray(capturedPayload.messages));
    assert.equal(capturedPayload.stream, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('MascotChat removes unanswered message from history on error to prevent duplicate on retry', async () => {
  const chat = new MascotChat();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('Network failed');
  };

  try {
    chat.history = [{ role: 'assistant', content: 'Привет!' }];
    await chat.sendMessage('Какая ошибка?');

    // Unanswered message should be popped from history
    assert.equal(chat.history.length, 1);
    assert.equal(chat.history[0].content, 'Привет!');
    assert.equal(chat.lastUserText, 'Какая ошибка?');
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test('MascotChat setPosition and resetPosition manage floating coordinates', () => {
  const chat = new MascotChat();
  const fakeContainer = {
    style: {},
    classList: {
      add: (c) => fakeContainer.classes.add(c),
      remove: (c) => fakeContainer.classes.delete(c),
      contains: (c) => fakeContainer.classes.has(c)
    },
    classes: new Set(),
    offsetWidth: 400,
    offsetHeight: 500
  };
  chat.container = fakeContainer;

  assert.equal(chat.isCustomPositioned(), false);

  // Set custom coordinates
  chat.setPosition(150, 200, { viewportWidth: 1000, viewportHeight: 800 });
  assert.equal(chat.isCustomPositioned(), true);
  assert.equal(fakeContainer.style.left, '150px');
  assert.equal(fakeContainer.style.top, '200px');
  assert.equal(fakeContainer.style.right, 'auto');
  assert.equal(fakeContainer.style.bottom, 'auto');
  assert.ok(fakeContainer.classes.has('floating-dragged'));

  // Reset coordinates
  chat.resetPosition();
  assert.equal(chat.isCustomPositioned(), false);
  assert.equal(fakeContainer.style.left, '');
  assert.equal(fakeContainer.style.top, '');
  assert.equal(fakeContainer.style.right, '');
  assert.equal(fakeContainer.style.bottom, '');
  assert.ok(!fakeContainer.classes.has('floating-dragged'));
});

test('MascotChat setPosition clamps coordinates within viewport bounds', () => {
  const chat = new MascotChat();
  const fakeContainer = {
    style: {},
    classList: { add: () => {}, remove: () => {} },
    offsetWidth: 400,
    offsetHeight: 500
  };
  chat.container = fakeContainer;

  // Attempt to drag offscreen to top-left (negative)
  chat.setPosition(-50, -30, { viewportWidth: 1000, viewportHeight: 800 });
  assert.equal(fakeContainer.style.left, '10px');
  assert.equal(fakeContainer.style.top, '10px');

  // Attempt to drag offscreen past bottom-right
  chat.setPosition(950, 750, { viewportWidth: 1000, viewportHeight: 800 });
  // Max left = 1000 - 400 - 10 = 590px
  // Max top = 800 - 500 - 10 = 290px
  assert.equal(fakeContainer.style.left, '590px');
  assert.equal(fakeContainer.style.top, '290px');
});

test('MascotChat setSize updates dimensions and clamps to limits', () => {
  const chat = new MascotChat();
  const fakeContainer = {
    style: {},
    classList: { add: () => {}, remove: () => {} },
    offsetWidth: 380,
    offsetHeight: 530
  };
  chat.container = fakeContainer;

  // Normal resize
  chat.setSize(450, 600, { viewportWidth: 1000, viewportHeight: 800 });
  assert.equal(fakeContainer.style.width, '450px');
  assert.equal(fakeContainer.style.height, '600px');

  // Below minimum clamp (min 320x420)
  chat.setSize(200, 300, { viewportWidth: 1000, viewportHeight: 800 });
  assert.equal(fakeContainer.style.width, '320px');
  assert.equal(fakeContainer.style.height, '420px');

  // Above viewport max clamp
  chat.setSize(1200, 950, { viewportWidth: 1000, viewportHeight: 800 });
  assert.equal(fakeContainer.style.width, '980px');
  assert.equal(fakeContainer.style.height, '760px');
});

test('MascotChat setSize updates left and top when floating', () => {
  const chat = new MascotChat();
  const fakeContainer = {
    style: { left: '300px', top: '200px' },
    classList: { add: () => {}, remove: () => {} },
    offsetWidth: 400,
    offsetHeight: 500
  };
  chat.container = fakeContainer;
  chat.customPos = { x: 300, y: 200 };

  // Resize top-left: expands width by 50px, new left is 250px
  chat.setSize(450, 550, { left: 250, top: 150, viewportWidth: 1000, viewportHeight: 800 });
  assert.equal(fakeContainer.style.width, '450px');
  assert.equal(fakeContainer.style.height, '550px');
  assert.equal(fakeContainer.style.left, '250px');
  assert.equal(fakeContainer.style.top, '150px');
  assert.deepEqual(chat.customPos, { x: 250, y: 150 });
});

test('renderMarkdown handles Windows CRLF line endings in code blocks', () => {
  const input = 'Код:\r\n```python\r\nprint("hello")\r\n```\r\nГотово!';
  const html = renderMarkdown(input);
  assert.ok(html.includes('class="mascot-code-block"'), 'Should parse code block with CRLF');
  assert.ok(html.includes('<code class="language-python">'));
});

test('renderMarkdown preserves special replacement characters like $1 and $& in code', () => {
  const input = '```python\npattern = r"$1 and $& and $\'"\n```';
  const html = renderMarkdown(input);
  assert.ok(html.includes('$1 and $&amp; and $&#039;') || html.includes('$1 and $& and $\''));
  assert.ok(!html.includes('__CODE_BLOCK_'));
});

test('renderMarkdown does not wrap code blocks in <p> tags', () => {
  const input = 'Вот код:\n```python\nx = 1\n```\nПродолжение';
  const html = renderMarkdown(input);
  assert.ok(!html.includes('<p><div class="mascot-code-block"'));
  assert.ok(!html.includes('</p></div>'));
});

test('MascotChat resizeInputField hides vertical scrollbar until max height is exceeded', () => {
  const chat = new MascotChat();
  const fakeInput = {
    value: 'Привет!\nПривет!\nПривет!',
    scrollHeight: 68,
    style: {}
  };
  chat.inputField = fakeInput;

  chat.resizeInputField();
  assert.equal(fakeInput.style.height, '68px');
  assert.equal(fakeInput.style.overflowY, 'hidden');

  // Exceed 110px max height -> enable scroll
  fakeInput.scrollHeight = 145;
  chat.resizeInputField();
  assert.equal(fakeInput.style.height, '110px');
  assert.equal(fakeInput.style.overflowY, 'auto');
});

test('getEditorContext returns catalog context with empty code when catalogView is active', () => {
  const originalDoc = globalThis.document;
  const originalWin = globalThis.window;

  globalThis.document = {
    getElementById: (id) => {
      if (id === 'catalogView') {
        return { style: { display: 'block' } };
      }
      if (id === 'workspaceView') {
        return {
          classList: { contains: (cls) => cls === 'active' ? false : false },
          style: { display: 'none' }
        };
      }
      if (id === 'topicTitleText') {
        return { textContent: 'Основы Python' };
      }
      return null;
    }
  };
  globalThis.window = {
    monaco: {
      editor: {
        getEditors: () => [{ getValue: () => 'temp_cache = 1\ndel temp_cache' }]
      }
    }
  };

  try {
    const ctx = getEditorContext();
    assert.equal(ctx.topic, 'Главная страница / Справочник');
    assert.equal(ctx.code, '');
  } finally {
    globalThis.document = originalDoc;
    globalThis.window = originalWin;
  }
});

test('getEditorContext returns workspace context and code when workspaceView is active', () => {
  const originalDoc = globalThis.document;
  const originalWin = globalThis.window;

  globalThis.document = {
    getElementById: (id) => {
      if (id === 'catalogView') {
        return { style: { display: 'none' } };
      }
      if (id === 'workspaceView') {
        return {
          classList: { contains: (cls) => cls === 'active' },
          style: { display: 'block' }
        };
      }
      if (id === 'topicTitleText') {
        return { textContent: 'Списки и кортежи' };
      }
      return null;
    }
  };
  globalThis.window = {
    monaco: {
      editor: {
        getEditors: () => [{ getValue: () => 'items = [1, 2, 3]' }]
      }
    }
  };

  try {
    const ctx = getEditorContext();
    assert.equal(ctx.topic, 'Списки и кортежи');
    assert.equal(ctx.code, 'items = [1, 2, 3]');
  } finally {
    globalThis.document = originalDoc;
    globalThis.window = originalWin;
  }
});



