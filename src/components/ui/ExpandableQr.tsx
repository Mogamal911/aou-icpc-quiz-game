import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog } from './Dialog';
import { Icon } from './Icon';

export function ExpandableQr({ value, code, size = 132 }: { value: string; code: string; size?: number }) {
  const [expanded, setExpanded] = useState(false);
  return <>
    <button className="qr-card qr-expand-button" type="button" aria-label="Expand join QR code" aria-haspopup="dialog" onClick={() => setExpanded(true)}><QRCodeSVG value={value} size={size} level="M" includeMargin /><span><Icon name="expand" size={16} />Expand QR code</span></button>
    {expanded && <Dialog title="Scan to join the contest" wide onClose={() => setExpanded(false)}><div className="dialog-body qr-expanded"><div className="qr-expanded-image"><QRCodeSVG value={value} size={600} level="M" includeMargin /></div><p className="qr-expanded-code">{code}</p><p className="muted">Scan with your camera, or enter this code in the quiz arena.</p></div></Dialog>}
  </>;
}
