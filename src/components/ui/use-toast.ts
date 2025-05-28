"use client"

// Simple toast implementation that doesn't use React hooks
export interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

// Global toast function that can be called from anywhere
export function showToast({ title, description, variant = 'default', duration = 5000 }: ToastProps) {
  const message = `${title || 'Meddelande'}${description ? ': ' + description : ''}`;
  
  console.log(`[Toast ${variant}]`, message);
  
  // Skapa en enkel visuell indikation
  if (typeof window !== 'undefined') {
    // Skapa ett enkelt toast-element
    const toastElement = document.createElement('div');
    toastElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${variant === 'destructive' ? '#dc2626' : variant === 'success' ? '#16a34a' : '#1f2937'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      max-width: 400px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    if (title) {
      const titleElement = document.createElement('div');
      titleElement.style.fontWeight = '600';
      titleElement.style.marginBottom = description ? '4px' : '0';
      titleElement.textContent = title;
      toastElement.appendChild(titleElement);
    }
    
    if (description) {
      const descElement = document.createElement('div');
      descElement.style.opacity = '0.9';
      descElement.textContent = description;
      toastElement.appendChild(descElement);
    }
    
    document.body.appendChild(toastElement);
    
    // Ta bort efter angiven tid
    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => {
          if (toastElement.parentNode) {
            toastElement.parentNode.removeChild(toastElement);
          }
        }, 300);
      }
    }, duration);
  }
}

// Hook version for React components
export function useToast() {
  return { toast: showToast };
} 