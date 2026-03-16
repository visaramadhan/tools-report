import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith('/admin');
      const isOnTechnician = nextUrl.pathname.startsWith('/technician');
      
      if (isOnAdmin) {
        if (isLoggedIn && (auth.user as any).role === 'admin') return true;
        return false; // Redirect unauthenticated users to login page
      }
      
      if (isOnTechnician) {
        if (isLoggedIn && (auth.user as any).role === 'technician') return true;
        // If admin tries to access technician page, maybe allow? Or redirect?
        // For strict separation:
        return false;
      }
      
      if (isLoggedIn) {
        // Redirect to respective dashboard if on login page or root
        if (nextUrl.pathname === '/login' || nextUrl.pathname === '/') {
           if ((auth.user as any).role === 'admin') {
             return Response.redirect(new URL('/admin/dashboard', nextUrl));
           } else {
             return Response.redirect(new URL('/technician/dashboard', nextUrl));
           }
        }
      }
      
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        (session.user as any).role = token.role as string;
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
  providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
