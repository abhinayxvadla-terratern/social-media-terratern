/**
 * Automated Validation Test Suite
 * Tests universal validation logic for names, emails, phones, and consent
 */

import {
  validateName,
  validateEmailSync,
  validatePhone,
  validateConsent,
} from './dist/validation.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('\n========================================');
console.log('🧪 1. Testing Full Name Validation');
console.log('========================================');

// Good names
assert(validateName('Rahul Sharma').valid === true, 'Accepts standard name: "Rahul Sharma"');
assert(validateName('A. P. J. Kalam').valid === true, 'Accepts dots: "A. P. J. Kalam"');
assert(validateName('Mary-Jane Watson').valid === true, 'Accepts hyphen: "Mary-Jane Watson"');
assert(validateName('Jean-Luc Picard').valid === true, 'Accepts hyphenated first name');
assert(validateName('Dr. John Doe').valid === true, 'Accepts title with dot');

// Bad names
assert(validateName('').valid === false, 'Rejects empty name');
assert(validateName('A').valid === false, 'Rejects 1-character name');
assert(validateName('A'.repeat(61)).valid === false, 'Rejects >60 character name');
assert(validateName('Rahul123').valid === false, 'Rejects names containing numbers');
assert(validateName('12345678').valid === false, 'Rejects numeric strings');
assert(validateName('aaaa').valid === false, 'Rejects single repeated letter "aaaa"');
assert(validateName('zzzzzz').valid === false, 'Rejects single repeated letter "zzzzzz"');
assert(validateName('.....').valid === false, 'Rejects dot string "....."');
assert(validateName('asdf').valid === false, 'Rejects junk word "asdf"');
assert(validateName('test').valid === false, 'Rejects junk word "test"');
assert(validateName('qwerty').valid === false, 'Rejects junk word "qwerty"');
assert(validateName('xxx').valid === false, 'Rejects junk word "xxx"');
assert(validateName('dummy').valid === false, 'Rejects junk word "dummy"');

console.log('\n========================================');
console.log('🧪 2. Testing Email Address Validation');
console.log('========================================');

// Good emails
assert(validateEmailSync('rahul.sharma@gmail.com').valid === true, 'Accepts valid email: rahul.sharma@gmail.com');
assert(validateEmailSync('contact@terratern.com').valid === true, 'Accepts corporate email: contact@terratern.com');
assert(validateEmailSync('user+tag@domain.co.in').valid === true, 'Accepts plus tag email: user+tag@domain.co.in');

// Bad emails
assert(validateEmailSync('').valid === false, 'Rejects empty email');
assert(validateEmailSync('invalid-email').valid === false, 'Rejects plain string without @');
assert(validateEmailSync('user@').valid === false, 'Rejects user@ without domain');
assert(validateEmailSync('@domain.com').valid === false, 'Rejects missing user');
assert(validateEmailSync('user@domain').valid === false, 'Rejects domain without TLD');

// Disposable emails
assert(validateEmailSync('test@mailinator.com').valid === false, 'Rejects disposable: mailinator.com');
assert(validateEmailSync('user@tempmail.com').valid === false, 'Rejects disposable: tempmail.com');
assert(validateEmailSync('throw@10minutemail.com').valid === false, 'Rejects disposable: 10minutemail.com');
assert(validateEmailSync('fake@guerrillamail.com').valid === false, 'Rejects disposable: guerrillamail.com');

// Typos and suggestions
const gmialRes = validateEmailSync('john@gmial.com');
assert(gmialRes.suggestion === 'john@gmail.com', 'Suggests gmail.com for gmial.com');

const gamilRes = validateEmailSync('sarah@gamil.com');
assert(gamilRes.suggestion === 'sarah@gmail.com', 'Suggests gmail.com for gamil.com');

const yahoooRes = validateEmailSync('alex@yahooo.com');
assert(yahoooRes.suggestion === 'alex@yahoo.com', 'Suggests yahoo.com for yahooo.com');

const hotmialRes = validateEmailSync('user@hotmial.com');
assert(hotmialRes.suggestion === 'user@hotmail.com', 'Suggests hotmail.com for hotmial.com');

const outlokRes = validateEmailSync('work@outlok.com');
assert(outlokRes.suggestion === 'work@outlook.com', 'Suggests outlook.com for outlok.com');

console.log('\n========================================');
console.log('🧪 3. Testing Phone Number Validation');
console.log('========================================');

// Good India phones (starts with 6-9, 10 digits)
const p1 = validatePhone('9876512345', 'IN');
assert(p1.valid === true && p1.e164 === '+919876512345', 'Accepts valid 10-digit India mobile starting with 9');

const p2 = validatePhone('8123456789', 'IN');
assert(p2.valid === true && p2.e164 === '+918123456789', 'Accepts valid 10-digit India mobile starting with 8');

const p3 = validatePhone('7012345678', 'IN');
assert(p3.valid === true && p3.e164 === '+917012345678', 'Accepts valid 10-digit India mobile starting with 7');

const p4 = validatePhone('6999888123', 'IN');
assert(p4.valid === true && p4.e164 === '+916999888123', 'Accepts valid 10-digit India mobile starting with 6');

const p5 = validatePhone('+91 98765 12345', 'IN');
assert(p5.valid === true && p5.e164 === '+919876512345', 'Handles +91 prefix and spacing');

const p6 = validatePhone('09876512345', 'IN');
assert(p6.valid === true && p6.e164 === '+919876512345', 'Handles leading 0 prefix');

// Bad India phones
assert(validatePhone('5123456789', 'IN').valid === false, 'Rejects India mobile starting with 5');
assert(validatePhone('4123456789', 'IN').valid === false, 'Rejects India mobile starting with 4');
assert(validatePhone('987654321', 'IN').valid === false, 'Rejects 9-digit number');
assert(validatePhone('98765432100', 'IN').valid === false, 'Rejects 11-digit number without prefix');

// Fake patterns
assert(validatePhone('9999999999', 'IN').valid === false, 'Rejects fake pattern: 9999999999');
assert(validatePhone('8888888888', 'IN').valid === false, 'Rejects fake pattern: 8888888888');
assert(validatePhone('0000000000', 'IN').valid === false, 'Rejects fake pattern: 0000000000');
assert(validatePhone('1234567890', 'IN').valid === false, 'Rejects fake sequential: 1234567890');
assert(validatePhone('9876543210', 'IN').valid === false, 'Rejects fake descending: 9876543210');

// International phone validation via libphonenumber-js
const usGood = validatePhone('+12025550123', 'US');
assert(usGood.valid === true, 'Accepts valid US number via libphonenumber-js');

const ukGood = validatePhone('+447911123456', 'GB');
assert(ukGood.valid === true, 'Accepts valid UK number via libphonenumber-js');

const invalidIntl = validatePhone('+10000000000', 'US');
assert(invalidIntl.valid === false, 'Rejects fake US number');

console.log('\n========================================');
console.log('🧪 4. Testing Consent Checkbox');
console.log('========================================');

assert(validateConsent(true).valid === true, 'Accepts boolean true');
assert(validateConsent('true').valid === true, 'Accepts string "true"');
assert(validateConsent(false).valid === false, 'Rejects boolean false');
assert(validateConsent(null).valid === false, 'Rejects null consent');
assert(validateConsent(undefined).valid === false, 'Rejects undefined consent');

console.log('\n========================================');
console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
