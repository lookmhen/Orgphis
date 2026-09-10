import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../services/templateService.js';

describe('Handlebars Template Engine & Security Escaping', () => {
  it('should substitute variables correctly', () => {
    const raw = 'Hello {{name}}, please click {{phishing_url}} for department {{department}}';
    const vars = {
      name: 'Somchai Jaidee',
      phishing_url: 'https://security.example.com/l/abc12345',
      department: 'Finance'
    };

    const rendered = renderTemplate(raw, vars);
    expect(rendered).toContain('Hello Somchai Jaidee');
    expect(rendered).toContain('https://security.example.com/l/abc12345');
    expect(rendered).toContain('department Finance');
  });

  it('should auto-escape malicious XSS payload in user-provided variables', () => {
    const raw = '<h3>Welcome, {{name}}</h3>';
    const vars = {
      name: '<script>alert("XSS")</script>'
    };

    const rendered = renderTemplate(raw, vars);
    expect(rendered).not.toContain('<script>');
    expect(rendered).toContain('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  });
});
