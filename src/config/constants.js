'use strict';

// Customer-facing document types accepted by the service.
const DOCUMENT_TYPES = Object.freeze([
  'account_statement',
  'kyc_identity',
  'kyc_proof_of_address',
  'signed_agreement',
  'tax_form',
  'correspondence',
  'other',
]);

// Document lifecycle states.
const DOCUMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  QUARANTINED: 'quarantined',
});

module.exports = { DOCUMENT_TYPES, DOCUMENT_STATUS };
