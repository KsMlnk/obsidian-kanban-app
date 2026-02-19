import { describe, it, expect } from 'vitest';
import { parseMarkdownTasks, computeFingerprint, generateKbId, extractKbId, injectKbId, stripKbIdFromTitle } from '../src/parser.js';

// ─── Real content from VirtoSoftware file ─────────────────────
const VS_CONTENT = `---
tags:
  - vs
---
- [ ] Legal case - regulator inquiry - track
- [ ] Legal case - letter to lawyers - see research notes
- [ ] faq Calendar - docs
\t    - настройки для браузеров
- [ ] Internal DB - plan and share with the team
- [ ] Alert app for admins - simple notifications
- [ ] Marketing plan with the team - till 1st June. How to measure
- [ ] Marketing - Reddit, Quora
 - [ ] Privacy and other docs - monitor task - to plan

- [ ] https://example.gov/ 🔺 - delayed because of paperwork
- [ ] [Your support request 0000000000000000 has been created. A support advocate will contact you during our](https://learn.microsoft.com/partner-center/support/support-hours) [support business hours](https://learn.microsoft.com/partner-center/support/support-hours) at the **email address you provided** in your request. - virtoway.com tenant
- [ ] Alerts - assessment tool - check if its's suitable for alerts
- [ ] Calendar Time Zones visualisation - like Outlook
- [ ] Calendar Zoom + Google
- [ ] Onprem Calendar
- [ ] AD apps to release - data?
- [ ] Online Upload app - date?
- [ ] New hire - research
- [ ] SharePoint Companies List - ideas?

- [ ] Lost Deals - email and contact - [Lost Deals 2024-2025.xlsx](https://contoso.sharepoint.com/:x:/s/demo-calendar/EXAMPLE0000000000000000000000000000000?e=EXAMPLE)

- [ ] Docs Page for Admins - template and what to put on it ⏫
- [ ] Built summ https://transloadit.com/devtips/hashing-files-with-curl-a-developer-s-guide/?utm_source=chatgpt.com

- [ ] List of Subscriptions to Check
- [ ] One Page License - add more description

- [ ] One Major Update for Every on-premises component
- [ ] Customer case follow-up - control
- [ ] Shared Calendar - permissions

General plan for Onpremises web parts - https://contoso-my.sharepoint.com/:w:/r/personal/example_user/_layouts/15/Doc.aspx

##### New NCAGE Request Success!

**NCAGE kodu 00000.**

Your request REF EXAMPLE000000 has been pre-recorded and a VALIDATION Email transmitted to your mailbox.

https://eportal.nspa.example.org/vendorregistration/private/registration - in progress ![[Screenshot 2025-09-25 at 11.27.15.png]]`;

// ─── Real content from Private file ──────────────────────────
const PRIVATE_CONTENT = `---
tags:
  - bank
  - car
  - contacts
  - finance/expense
  - personal
  - receipt
  - spain

---

https://app.example-swap.com/order-details?id=EXAMPLE0000000000000000

- [x] Car color - ordered ➕ 2025-10-15  https://www.ebay.es/ItemNotReceived/0000000000?itemId=000000000000&transactionId=00000000000000
\t
- [ ] Contractor расчет
- [ ] Court case - date of answer 🔺
- [ ] Agreement with a new director - check email and ask for support
- [ ] Shares to answer??? Check email🔺
- [ ] Debt - personal - date to pay?
- [ ] Investment - see details and talk to partners
- [ ] Забрать документы в офисе - среда? `;

// ─── Real content from Cervantes file (duplicate frontmatter) ─
const CERVANTES_CONTENT = `---
type: general
tags: property/cervantes
---

---
tags:
  - property
  - property/cervantes
  - spain

- [ ] Вода - труба для дренажа
- [ ] Доводчик

- [x] Подкраска - кухня, офис, гостевая, спальня
\t
- [ ] Led-подсветка 25 1 см глубина 1 см ширина
- [ ] электрика - схема на участке, дом, терраса
- [ ] электрика - схема на шкаф
- [ ] Вода план/схема

- [ ] Электрика терраса - проверить

- [ ] Замена автоматизации полива - https://www.example.com/irrigation/controllers/node-bt - отправлен запрос https://example.es/

`;

// ─── Real content from VP file ───────────────────────────────
const VP_CONTENT = `
- [ ] Analysis https://sandbox.example.dev/preview/`;

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('parseMarkdownTasks', () => {
  describe('VirtoSoftware file', () => {
    const tasks = parseMarkdownTasks(VS_CONTENT);

    it('parses all tasks (skipping frontmatter, headings, paragraphs)', () => {
      expect(tasks.length).toBe(26);
    });

    it('parses simple unchecked task', () => {
      expect(tasks[0].title).toBe('Legal case - regulator inquiry - track');
      expect(tasks[0].isDone).toBe(false);
      expect(tasks[0].priority).toBeNull();
      expect(tasks[0].lineNumber).toBe(5);
    });

    it('captures sub-items for faq Calendar task', () => {
      const faqTask = tasks.find((t) => t.title.startsWith('faq Calendar'));
      expect(faqTask).toBeDefined();
      expect(faqTask!.subItems).toHaveLength(1);
      expect(faqTask!.subItems[0]).toBe('- настройки для браузеров');
    });

    it('recognizes task with leading space as separate task', () => {
      const privacyTask = tasks.find((t) => t.title.startsWith('Privacy and other docs'));
      expect(privacyTask).toBeDefined();
      expect(privacyTask!.isDone).toBe(false);
    });

    it('extracts urgent priority from 🔺 emoji', () => {
      const samTask = tasks.find((t) => t.title.includes('example.gov'));
      expect(samTask).toBeDefined();
      expect(samTask!.priority).toBe('urgent');
    });

    it('extracts high priority from ⏫ emoji', () => {
      const docsTask = tasks.find((t) => t.title.includes('Docs Page for Admins'));
      expect(docsTask).toBeDefined();
      expect(docsTask!.priority).toBe('high');
    });

    it('extracts markdown link URLs', () => {
      const supportTask = tasks.find((t) => t.title.includes('support request'));
      expect(supportTask).toBeDefined();
      expect(supportTask!.urls).toContain('https://learn.microsoft.com/partner-center/support/support-hours');
    });

    it('extracts bare URLs', () => {
      const samTask = tasks.find((t) => t.title.includes('example.gov'));
      expect(samTask).toBeDefined();
      expect(samTask!.urls).toContain('https://example.gov/');
    });

    it('extracts sharepoint link from Lost Deals task', () => {
      const lostDeals = tasks.find((t) => t.title.includes('Lost Deals'));
      expect(lostDeals).toBeDefined();
      expect(lostDeals!.urls.length).toBeGreaterThanOrEqual(1);
      expect(lostDeals!.urls[0]).toContain('sharepoint.com');
    });

    it('extracts bare URL from Built summ task', () => {
      const builtTask = tasks.find((t) => t.title.includes('Built summ'));
      expect(builtTask).toBeDefined();
      expect(builtTask!.urls).toContain(
        'https://transloadit.com/devtips/hashing-files-with-curl-a-developer-s-guide/?utm_source=chatgpt.com',
      );
    });

    it('skips non-task content (headings, paragraphs, bare URLs, images)', () => {
      // None of these should be parsed as tasks:
      // - "General plan for Onpremises..."
      // - "##### New NCAGE Request Success!"
      // - "**NCAGE kodu 00000.**"
      // - bare URL lines
      // - image embeds
      const titles = tasks.map((t) => t.title);
      expect(titles.some((t) => t.includes('NCAGE'))).toBe(false);
      expect(titles.some((t) => t.includes('General plan'))).toBe(false);
      expect(titles.some((t) => t.includes('VALIDATION'))).toBe(false);
      expect(titles.some((t) => t.includes('eportal.nspa'))).toBe(false);
    });

    it('all tasks are not done', () => {
      expect(tasks.every((t) => !t.isDone)).toBe(true);
    });
  });

  describe('Private file', () => {
    const tasks = parseMarkdownTasks(PRIVATE_CONTENT);

    it('parses all 8 tasks', () => {
      expect(tasks.length).toBe(8);
    });

    it('detects done task (Car color)', () => {
      expect(tasks[0].title).toContain('Car color');
      expect(tasks[0].isDone).toBe(true);
    });

    it('extracts URLs from done task with inline links', () => {
      expect(tasks[0].urls.length).toBeGreaterThanOrEqual(1);
      expect(tasks[0].urls[0]).toContain('ebay.es');
    });

    it('skips bare URL line (example-swap) before tasks', () => {
      const titles = tasks.map((t) => t.title);
      expect(titles.some((t) => t.includes('example-swap'))).toBe(false);
    });

    it('does not capture tab-only line as sub-item', () => {
      // After the Car color task there's a line with just a tab
      expect(tasks[0].subItems).toHaveLength(0);
    });

    it('detects urgent priority in Court case', () => {
      const vcTask = tasks.find((t) => t.title.includes('Court case'));
      expect(vcTask).toBeDefined();
      expect(vcTask!.priority).toBe('urgent');
    });

    it('detects urgent priority when emoji is adjacent to text (no space)', () => {
      // "Shares to answer??? Check email🔺"
      const singvest = tasks.find((t) => t.title.includes('Shares to answer'));
      expect(singvest).toBeDefined();
      expect(singvest!.priority).toBe('urgent');
    });

    it('handles mixed language tasks', () => {
      const olegTask = tasks.find((t) => t.title.includes('Contractor'));
      expect(olegTask).toBeDefined();
      expect(olegTask!.title).toContain('расчет');
    });
  });

  describe('Cervantes file (duplicate frontmatter)', () => {
    const tasks = parseMarkdownTasks(CERVANTES_CONTENT);

    it('parses all 9 tasks despite duplicate frontmatter blocks', () => {
      expect(tasks.length).toBe(9);
    });

    it('first task is Вода', () => {
      expect(tasks[0].title).toContain('Вода');
      expect(tasks[0].isDone).toBe(false);
    });

    it('detects done task (Подкраска)', () => {
      const doneTask = tasks.find((t) => t.title.includes('Подкраска'));
      expect(doneTask).toBeDefined();
      expect(doneTask!.isDone).toBe(true);
    });

    it('extracts multiple bare URLs from Замена автоматизации task', () => {
      const irrigationTask = tasks.find((t) => t.title.includes('Замена автоматизации'));
      expect(irrigationTask).toBeDefined();
      expect(irrigationTask!.urls.length).toBe(2);
      expect(irrigationTask!.urls).toContain(
        'https://www.example.com/irrigation/controllers/node-bt',
      );
      expect(irrigationTask!.urls).toContain('https://example.es/');
    });

    it('does not include YAML list items as tasks or sub-items', () => {
      const titles = tasks.map((t) => t.title);
      expect(titles.some((t) => t === 'property')).toBe(false);
      expect(titles.some((t) => t === 'spain')).toBe(false);
    });
  });

  describe('VP file (no frontmatter, minimal)', () => {
    const tasks = parseMarkdownTasks(VP_CONTENT);

    it('parses single task', () => {
      expect(tasks.length).toBe(1);
    });

    it('extracts URL from task title', () => {
      expect(tasks[0].title).toContain('Analysis');
      expect(tasks[0].urls.length).toBe(1);
      expect(tasks[0].urls[0]).toContain('sandbox.example.dev');
    });

    it('has no priority', () => {
      expect(tasks[0].priority).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles empty content', () => {
      expect(parseMarkdownTasks('')).toEqual([]);
    });

    it('handles content with only frontmatter', () => {
      const content = `---\ntags:\n  - test\n---\n`;
      expect(parseMarkdownTasks(content)).toEqual([]);
    });

    it('handles content with only non-task lines', () => {
      const content = `# Heading\n\nSome paragraph.\n\nhttps://example.com\n`;
      expect(parseMarkdownTasks(content)).toEqual([]);
    });

    it('handles task immediately after frontmatter with no blank line', () => {
      const content = `---\ntags: test\n---\n- [ ] First task`;
      const tasks = parseMarkdownTasks(content);
      expect(tasks.length).toBe(1);
      expect(tasks[0].title).toBe('First task');
    });

    it('handles [X] (uppercase) as done', () => {
      const content = `- [X] Done with uppercase X`;
      const tasks = parseMarkdownTasks(content);
      expect(tasks.length).toBe(1);
      expect(tasks[0].isDone).toBe(true);
    });

    it('handles multiple sub-items', () => {
      const content = `- [ ] Parent task\n\t- sub 1\n\t- sub 2\n\t- sub 3`;
      const tasks = parseMarkdownTasks(content);
      expect(tasks.length).toBe(1);
      expect(tasks[0].subItems).toEqual(['- sub 1', '- sub 2', '- sub 3']);
    });

    it('handles tasks interleaved with paragraphs', () => {
      const content = `- [ ] Task A\n\nSome paragraph\n\n- [ ] Task B\n\nAnother paragraph`;
      const tasks = parseMarkdownTasks(content);
      expect(tasks.length).toBe(2);
      expect(tasks[0].title).toBe('Task A');
      expect(tasks[1].title).toBe('Task B');
    });

    it('supports custom priority defs and strips emoji from title', () => {
      const content = '- [ ] ⚡ Fix prod issue now';
      const tasks = parseMarkdownTasks(content, [
        { id: 'blocker', emoji: '⚡', label: 'Blocker', color: '#dc2626' },
      ]);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].priority).toBe('blocker');
      expect(tasks[0].title).toBe('Fix prod issue now');
    });

    it('preserves correct line numbers', () => {
      const content = `---\ntags: x\n---\n\n\n- [ ] Task on line 6`;
      const tasks = parseMarkdownTasks(content);
      expect(tasks.length).toBe(1);
      expect(tasks[0].lineNumber).toBe(6);
    });

    it('does not match YAML list items as tasks', () => {
      const content = `---\ntags:\n  - property\n  - spain\n---\n- [ ] Real task`;
      const tasks = parseMarkdownTasks(content);
      expect(tasks.length).toBe(1);
      expect(tasks[0].title).toBe('Real task');
    });
  });
});

describe('kb:id markers', () => {
  describe('generateKbId', () => {
    it('generates 8-char hex string', () => {
      const id = generateKbId();
      expect(id).toMatch(/^[a-f0-9]{8}$/);
    });

    it('generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateKbId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('extractKbId', () => {
    it('extracts id from standard marker', () => {
      expect(extractKbId('- [ ] Task text <!-- kb:id=a1b2c3d4 -->')).toBe('a1b2c3d4');
    });

    it('extracts id with spaces around marker', () => {
      expect(extractKbId('- [ ] Task <!-- kb:id=abc12345 -->')).toBe('abc12345');
    });

    it('returns null when no marker', () => {
      expect(extractKbId('- [ ] Task without marker')).toBeNull();
    });

    it('handles hyphens and underscores in id', () => {
      expect(extractKbId('- [ ] Task <!-- kb:id=a1-b2_c3 -->')).toBe('a1-b2_c3');
    });
  });

  describe('injectKbId', () => {
    it('appends marker to line without one', () => {
      expect(injectKbId('- [ ] Task text', 'abc12345')).toBe('- [ ] Task text <!-- kb:id=abc12345 -->');
    });

    it('replaces existing marker', () => {
      expect(injectKbId('- [ ] Task <!-- kb:id=old123 -->', 'new456'))
        .toBe('- [ ] Task <!-- kb:id=new456 -->');
    });

    it('trims trailing whitespace before appending', () => {
      expect(injectKbId('- [ ] Task text   ', 'abc12345')).toBe('- [ ] Task text <!-- kb:id=abc12345 -->');
    });
  });

  describe('stripKbIdFromTitle', () => {
    it('strips marker from title', () => {
      expect(stripKbIdFromTitle('Task text <!-- kb:id=abc12345 -->')).toBe('Task text');
    });

    it('returns title as-is when no marker', () => {
      expect(stripKbIdFromTitle('Task text')).toBe('Task text');
    });
  });

  describe('parseMarkdownTasks with kb:id', () => {
    it('extracts kbId from task lines', () => {
      const content = '- [ ] My task <!-- kb:id=a1b2c3d4 -->\n- [ ] Another task';
      const tasks = parseMarkdownTasks(content);
      expect(tasks).toHaveLength(2);
      expect(tasks[0].kbId).toBe('a1b2c3d4');
      expect(tasks[0].title).toBe('My task');
      expect(tasks[1].kbId).toBeNull();
    });

    it('strips kb:id from displayed title', () => {
      const content = '- [ ] Important task <!-- kb:id=deadbeef -->';
      const tasks = parseMarkdownTasks(content);
      expect(tasks[0].title).toBe('Important task');
      expect(tasks[0].title).not.toContain('kb:id');
    });

    it('preserves URLs and priority with kb:id', () => {
      const content = '- [ ] https://example.com 🔺 Task <!-- kb:id=abc12345 -->';
      const tasks = parseMarkdownTasks(content);
      expect(tasks[0].kbId).toBe('abc12345');
      expect(tasks[0].priority).toBe('urgent');
      expect(tasks[0].urls).toContain('https://example.com');
    });

    it('tasks without kb:id have null kbId', () => {
      const tasks = parseMarkdownTasks('- [ ] Plain task\n- [x] Done task');
      expect(tasks[0].kbId).toBeNull();
      expect(tasks[1].kbId).toBeNull();
    });
  });
});

describe('computeFingerprint', () => {
  it('returns 8-char hex string', () => {
    const fp = computeFingerprint('some task', 'board1', 0);
    expect(fp).toMatch(/^[a-f0-9]{8}$/);
  });

  it('same input produces same fingerprint', () => {
    const a = computeFingerprint('Task Title', 'vs', 3);
    const b = computeFingerprint('Task Title', 'vs', 3);
    expect(a).toBe(b);
  });

  it('different occurrence index produces different fingerprint', () => {
    const a = computeFingerprint('Same Title', 'vs', 0);
    const b = computeFingerprint('Same Title', 'vs', 1);
    expect(a).not.toBe(b);
  });

  it('different board produces different fingerprint', () => {
    const a = computeFingerprint('Same Title', 'vs', 0);
    const b = computeFingerprint('Same Title', 'private', 0);
    expect(a).not.toBe(b);
  });

  it('normalizes whitespace and case', () => {
    const a = computeFingerprint('  Task  Title  ', 'vs', 0);
    const b = computeFingerprint('task title', 'vs', 0);
    expect(a).toBe(b);
  });
});
