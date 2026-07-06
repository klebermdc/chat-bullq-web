import type { SVGProps } from 'react';

export function ZappfyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 50 45" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M9.476 36.599s-2.672.057-4.005-.012C2.239 36.42.083 34.344.055 31.096c-.073-8.511-.073-17.025 0-25.536C.083 2.18 2.269.052 5.7.039 18.439-.012 31.18-.014 43.917.039c3.517.013 5.634 2.215 5.657 5.793.053 8.333.053 16.665-.006 24.998-.028 3.684-2.186 5.739-5.971 5.762-7.8.043-15.599.014-23.428.014-2.092 4.831-5.368 8.383-10.557 8.394-1.706.005-2.922-.417-2.922-.417s2.916-1.322 3.925-3.615c1.202-2.731.454-4.351.454-4.351l-1.594-.018Z"
        fill="url(#zappfy_grad)"
      />
      <path
        d="M27.828 11.226h-8.823a4.226 4.226 0 0 1-4.228-4.223h20.331v4.223L21.655 24.896h9.327a4.226 4.226 0 0 1 4.228 4.223H14.41v-4.223l13.419-13.67Z"
        fill="#171D18"
      />
      <defs>
        <linearGradient id="zappfy_grad" x1="-10.158" y1="43.912" x2="51.345" y2="-1.247" gradientUnits="userSpaceOnUse">
          <stop stopColor="#51C26F" />
          <stop offset="1" stopColor="#F2E901" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function MetaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        fill="url(#meta_grad)"
        d="M18 1L21.62 4.48L26.5 3.28L27.9 8.1L32.72 9.5L31.52 14.38L35 18L31.52 21.62L32.72 26.5L27.9 27.9L26.5 32.72L21.62 31.52L18 35L14.38 31.52L9.5 32.72L8.1 27.9L3.28 26.5L4.48 21.62L1 18L4.48 14.38L3.28 9.5L8.1 8.1L9.5 3.28L14.38 4.48Z"
      />
      <path
        d="M11.5 18.5L16 23L25 13.5"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <defs>
        <linearGradient id="meta_grad" x1="18" y1="1" x2="18" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1FB1FF" />
          <stop offset="1" stopColor="#0066E1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="18" cy="18" r="18" fill="url(#ig_grad)" />
      <rect x="9.5" y="9.5" width="17" height="17" rx="5" stroke="white" strokeWidth="2.6" fill="none" />
      <circle cx="18" cy="18" r="4.4" stroke="white" strokeWidth="2.6" fill="none" />
      <circle cx="23.2" cy="12.8" r="1.15" fill="white" />
      <defs>
        <radialGradient id="ig_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(7 38) rotate(-55) scale(48)">
          <stop stopColor="#FFD600" />
          <stop offset="0.25" stopColor="#FF7A00" />
          <stop offset="0.55" stopColor="#FF137C" />
          <stop offset="0.85" stopColor="#A02DAA" />
          <stop offset="1" stopColor="#5851DB" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function WasenderIcon(props: SVGProps<SVGSVGElement>) {
  // WhatsApp verde + motivo de QR Code no canto, para distinguir do Zappfy.
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="18" cy="18" r="18" fill="url(#wa_grad)" />
      <path
        d="M18 8.4c-5.3 0-9.6 4.3-9.6 9.6 0 1.7.45 3.35 1.3 4.8L8.4 27.6l4.95-1.28a9.55 9.55 0 0 0 4.65 1.2h.01c5.3 0 9.6-4.3 9.6-9.6S23.3 8.4 18 8.4Z"
        fill="white"
      />
      <path
        d="M14.7 13.1c-.2-.45-.4-.46-.6-.47l-.5-.01c-.18 0-.46.06-.7.33-.24.27-.92.9-.92 2.19 0 1.29.94 2.53 1.07 2.71.13.18 1.82 2.9 4.5 3.95 2.23.88 2.68.7 3.17.66.49-.05 1.57-.64 1.79-1.26.22-.62.22-1.15.16-1.26-.07-.11-.24-.18-.5-.31-.27-.13-1.57-.77-1.81-.86-.24-.09-.42-.13-.6.13-.18.27-.68.86-.84 1.04-.15.18-.31.2-.57.07-.27-.13-1.12-.41-2.14-1.32-.79-.7-1.32-1.57-1.48-1.84-.15-.27-.02-.41.12-.54.12-.12.27-.31.4-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.13-.59-1.43-.83-1.95Z"
        fill="url(#wa_grad)"
      />
      <rect x="21" y="7.5" width="7.2" height="7.2" rx="1.4" fill="white" stroke="url(#wa_grad)" strokeWidth="1.1" />
      <rect x="22.7" y="9.2" width="3.8" height="3.8" rx="0.5" fill="url(#wa_grad)" />
      <defs>
        <linearGradient id="wa_grad" x1="18" y1="0" x2="18" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#25D366" />
          <stop offset="1" stopColor="#128C7E" />
        </linearGradient>
      </defs>
    </svg>
  );
}
