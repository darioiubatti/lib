import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "690a4989ccd24d15996cb573", 
  requiresAuth: true // Ensure authentication is required for all operations
});
