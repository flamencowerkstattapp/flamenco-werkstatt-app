/**
 * Email Verification Link Handler
 * Processes Firebase email verification links from URL parameters
 */

export interface EmailVerificationParams {
  mode?: string;
  oobCode?: string;
  apiKey?: string;
  continueUrl?: string;
  lang?: string;
}

/**
 * Extract email verification parameters from URL
 */
export const getEmailVerificationParams = (): EmailVerificationParams => {
  const params: EmailVerificationParams = {};
  
  // Check if we're in a browser environment
  if (typeof window !== 'undefined' && window.location) {
    const urlParams = new URLSearchParams(window.location.search);
    
    params.mode = urlParams.get('mode') || undefined;
    params.oobCode = urlParams.get('oobCode') || undefined;
    params.apiKey = urlParams.get('apiKey') || undefined;
    params.continueUrl = urlParams.get('continueUrl') || undefined;
    params.lang = urlParams.get('lang') || undefined;
    
    // Debug logging
    console.log('Email verification params detected:', params);
    console.log('Current URL:', window.location.href);
  }
  
  return params;
};

/**
 * Check if current URL contains email verification parameters
 */
export const isEmailVerificationLink = (): boolean => {
  const params = getEmailVerificationParams();
  const isVerification = params.mode === 'verifyEmail' && !!params.oobCode;
  console.log('Is email verification link:', isVerification);
  return isVerification;
};

/**
 * Clean the URL by removing Firebase email verification parameters
 */
export const cleanVerificationUrl = (): void => {
  if (typeof window !== 'undefined' && window.location) {
    console.log('Cleaning verification URL...');
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    
    // Remove Firebase parameters
    params.delete('mode');
    params.delete('oobCode');
    params.delete('apiKey');
    params.delete('continueUrl');
    params.delete('lang');
    
    // Update URL without parameters
    const cleanUrl = url.origin + url.pathname;
    window.history.replaceState({}, '', cleanUrl);
    console.log('URL cleaned to:', cleanUrl);
  }
};
