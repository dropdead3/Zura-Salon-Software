import React from 'react';

interface BoothRentIconProps {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

const BoothRentIcon = React.forwardRef<SVGSVGElement, BoothRentIconProps>(
  ({ size = 24, color = 'currentColor', className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 13.74 14.58"
      fill={color}
      className={className}
      {...props}
    >
      <path d="M3.45,14.58l-.08-.05c-.41-.24-.44-.56-.41-.73.05-.34.32-.59.66-.61h2.32v-3.12h-2.31c-.88,0-1.62-.55-1.88-1.4L.07,2.42C-.07,1.89,0,1.35.3.89.6.43,1.08.11,1.63.02c.1-.01.19-.02.28-.02.87,0,1.64.59,1.87,1.43l.78,2.92h3.32c.19,0,.37.08.5.22.13.14.2.33.19.51-.02.37-.33.65-.7.65h-2.93l.13.5h4.56c.82.02,1.44.65,1.45,1.47v.92c0,.67-.44,1.21-1.05,1.4l.34,1.29h2.67c.38,0,.69.31.69.69,0,.38-.31.69-.69.69h-2.84c-.53,0-.96-.34-1.11-.84l-.47-1.77h-1.31v3.12h2.29c.28,0,.54.17.64.43.12.29.03.61-.22.8l-.19.15H3.45ZM3.07,8.3c.06.23.27.39.52.39h6.01s.09,0,.09-.06v-.96s-5.14-.06-5.14-.06c-.33-.01-.58-.2-.68-.5l-.37-1.38h-1.12s.69,2.57.69,2.57ZM1.93,1.38s-.1,0-.15.02c-.25.07-.46.34-.38.65l.61,2.3h1.12s-.68-2.55-.68-2.55c-.07-.25-.28-.42-.52-.42Z" />
    </svg>
  )
);

BoothRentIcon.displayName = 'BoothRentIcon';

export default BoothRentIcon;
