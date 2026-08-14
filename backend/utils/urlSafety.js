'use strict';

const dns = require('dns').promises;
const net = require('net');

class UnsafeUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsafeUrlError';
    this.statusCode = 422;
  }
}

function normalizeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new UnsafeUrlError('A website URL is required.');
  }

  const input = value.trim();
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(input);
  if (hasScheme && !/^https?:\/\//i.test(input)) {
    throw new UnsafeUrlError('Only HTTP and HTTPS website URLs are allowed.');
  }
  const candidate = hasScheme ? input : `https://${input}`;
  let url;

  try {
    url = new URL(candidate);
  } catch {
    throw new UnsafeUrlError('A valid HTTP or HTTPS website URL is required.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new UnsafeUrlError('Only HTTP and HTTPS website URLs are allowed.');
  }
  if (!url.hostname || url.username || url.password) {
    throw new UnsafeUrlError('The website URL must not include credentials and must include a hostname.');
  }
  if (url.port && !/^\d+$/.test(url.port)) {
    throw new UnsafeUrlError('The website URL contains an invalid port.');
  }

  return url;
}

function isBlockedIPv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 2 || b === 88 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0)
  );
}

function expandIPv6(address) {
  const value = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (value.includes('.')) return null;
  const halves = value.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const parts = [...left, ...Array(missing).fill('0'), ...right];
  if (parts.length !== 8 || parts.some(part => !/^[0-9a-f]{1,4}$/i.test(part))) return null;
  return parts.map(part => parseInt(part, 16));
}

function isBlockedIPv6(address) {
  const groups = expandIPv6(address);
  if (!groups) return true;
  const [first] = groups;
  const isUnspecified = groups.every(group => group === 0);
  const isLoopback = groups.slice(0, 7).every(group => group === 0) && groups[7] === 1;
  if (isUnspecified || isLoopback) return true;

  // IPv4-mapped (::ffff:0:0/96) and IPv4-compatible (::/96) forms must inherit IPv4 blocks.
  const mappedPrefix = groups.slice(0, 5).every(group => group === 0) && groups[5] === 0xffff;
  const compatiblePrefix = groups.slice(0, 6).every(group => group === 0);
  if (mappedPrefix || compatiblePrefix) {
    const ipv4 = `${groups[6] >> 8}.${groups[6] & 0xff}.${groups[7] >> 8}.${groups[7] & 0xff}`;
    return isBlockedIPv4(ipv4);
  }

  return (
    (first & 0xfe00) === 0xfc00 || // Unique local fc00::/7
    (first & 0xffc0) === 0xfe80 || // Link-local fe80::/10
    (first & 0xff00) === 0xff00 || // Multicast ff00::/8
    (first === 0x2001 && groups[1] === 0x0db8) // Documentation 2001:db8::/32
  );
}

function isPublicIp(address) {
  const family = net.isIP(address);
  if (family === 4) return !isBlockedIPv4(address);
  if (family === 6) return !isBlockedIPv6(address);
  return false;
}

async function resolvePublicAddress(hostname) {
  const literalFamily = net.isIP(hostname);
  if (literalFamily) {
    if (!isPublicIp(hostname)) throw new UnsafeUrlError('Private, loopback, and reserved network addresses are not allowed.');
    return { address: hostname, family: literalFamily };
  }

  let records;
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError('The website hostname could not be resolved.');
  }

  if (!records.length || records.some(record => !isPublicIp(record.address))) {
    throw new UnsafeUrlError('Private, loopback, and reserved network addresses are not allowed.');
  }

  return records[0];
}

async function validatePublicWebsiteUrl(value) {
  const url = normalizeHttpUrl(value);
  await resolvePublicAddress(url.hostname);
  return url;
}

module.exports = {
  UnsafeUrlError,
  normalizeHttpUrl,
  isPublicIp,
  resolvePublicAddress,
  validatePublicWebsiteUrl,
};
