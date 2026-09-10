import { afterEach, describe, expect, it } from 'bun:test';
import { getFrontendBaseUrl } from '../utils/frontend-url';

const originalDomain = process.env.DOMAIN_NAME;
const originalBase = process.env.FRONTEND_BASE_URL;

function unsetDomain(): void {
  delete process.env.DOMAIN_NAME;
}

function unsetBase(): void {
  delete process.env.FRONTEND_BASE_URL;
}

afterEach(() => {
  if (originalDomain === undefined) {
    unsetDomain();
  } else {
    process.env.DOMAIN_NAME = originalDomain;
  }
  if (originalBase === undefined) {
    unsetBase();
  } else {
    process.env.FRONTEND_BASE_URL = originalBase;
  }
});

describe('getFrontendBaseUrl', () => {
  it('defaults to localhost with http and :8080 when env is unset', () => {
    unsetDomain();
    unsetBase();
    expect(getFrontendBaseUrl()).toBe('http://localhost:8080');
  });

  it('adds https for a bare production domain', () => {
    process.env.DOMAIN_NAME = 'simak.politekniksorowako.ac.id';
    unsetBase();
    expect(getFrontendBaseUrl()).toBe('https://simak.politekniksorowako.ac.id');
  });

  it('keeps an explicit port on non-localhost domains', () => {
    process.env.DOMAIN_NAME = 'simak.example.com:8443';
    unsetBase();
    expect(getFrontendBaseUrl()).toBe('https://simak.example.com:8443');
  });

  it('defaults localhost to :8080 when no port given', () => {
    process.env.DOMAIN_NAME = 'localhost';
    unsetBase();
    expect(getFrontendBaseUrl()).toBe('http://localhost:8080');
  });

  it('preserves an explicit localhost port', () => {
    process.env.DOMAIN_NAME = 'localhost:3000';
    unsetBase();
    expect(getFrontendBaseUrl()).toBe('http://localhost:3000');
  });

  it('normalizes whitespace and trailing slashes', () => {
    unsetDomain();
    process.env.FRONTEND_BASE_URL = '  https://staging-simak.example.com/  ';
    expect(getFrontendBaseUrl()).toBe('https://staging-simak.example.com');
  });

  it('gives FRONTEND_BASE_URL priority over DOMAIN_NAME', () => {
    process.env.DOMAIN_NAME = 'simak.example.com';
    process.env.FRONTEND_BASE_URL = 'http://localhost:8082';
    expect(getFrontendBaseUrl()).toBe('http://localhost:8082');
  });
});
