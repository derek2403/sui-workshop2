/**
 * Type definitions for the Gas Station integration
 */

/**
 * Request body for building a sponsored transaction
 */
export interface BuildSponsoredTxRequest {
  sender: string;
  // Add additional fields needed for your transaction
  // For example, for a simple math operation:
  num1?: number;
  num2?: number;
  // For a generic transaction:
  transactionData?: any;
}

/**
 * Response from building a sponsored transaction
 */
export interface BuildSponsoredTxResponse {
  txBytes: string;
  sponsorSignature: string;
  digest: string;
}

/**
 * Request body for executing a sponsored transaction
 */
export interface ExecuteSponsoredTxRequest {
  txBytes: string;
  sponsorSignature: string;
  senderSignature: string;
}

/**
 * Response from executing a sponsored transaction
 */
export interface ExecuteSponsoredTxResponse {
  digest: string;
  effects: any;
  [key: string]: any;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  details?: any;
}


