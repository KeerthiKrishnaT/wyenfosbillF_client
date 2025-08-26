import defaultLogo from '../../../../assets/images/Wyenfos_bills_logo.png';

export const getLogoUrl = (logoPath, companyName) => {
  if (!logoPath) {
    // If no logo path provided, generate based on company name
    if (companyName) {
      const logoMap = {
        'WYENFOS INFOTECH': '/uploads/wyenfos_infotech.png',
        'WYENFOS GOLD AND DIAMONDS': '/uploads/wyenfos_gold.png',
        'WYENFOS ADS': '/uploads/wyenfos_ads.png',
        'WYENFOS CASH VAPASE': '/uploads/wyenfos_cash.png',
        'AYUR FOR HERBALS INDIA': '/uploads/Ayur4life_logo.png',
        'WYENFOS': '/uploads/wyenfos.png',
        'WYENFOS PURE DROPS': '/uploads/wyenfos pure drops.png',
      };
      return logoMap[companyName] || defaultLogo;
    }
    return defaultLogo;
  }
  if (logoPath.startsWith('http')) return logoPath;
  if (logoPath.startsWith('/uploads')) return logoPath; // Use relative path for proxy
  if (logoPath.startsWith('/Uploads')) return `http://localhost:5000${logoPath}`;
  return logoPath;
};

export const getCompanyDetails = (companyName) => {
  const companyDetails = {
    'WYENFOS INFOTECH': {
      name: 'WYENFOS INFOTECH',
      address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
      GSTIN: '32AAECW1234B1Z0',
      state: 'Kerala',
      stateCode: '32',
      mobile: '+91 9847012345',
      email: 'info@wyenfos.com',
      website: 'www.wyenfos.com',
      logo: '/uploads/wyenfos_infotech.png',
      qrCode: '/uploads/bank-qr-codes/COMBINED_WYENFOS_1755333147704.png',
      prefix: 'WIT'
    },
    'WYENFOS GOLD AND DIAMONDS': {
      name: 'WYENFOS GOLD AND DIAMONDS',
      address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
      GSTIN: '32AAECW1234B1Z1',
      state: 'Kerala',
      stateCode: '32',
      mobile: '+91 9847012346',
      email: 'gold@wyenfos.com',
      website: 'www.wyenfosgold.com',
      logo: '/uploads/wyenfos_gold.png',
      qrCode: '/uploads/bank-qr-codes/COMBINED_WYENFOS_GOLD_AND_DIAMONDS_1755332863742.png',
      prefix: 'WGD'
    },
    'WYENFOS ADS': {
      name: 'WYENFOS ADS',
      address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
      GSTIN: '32AAECW1234B1Z2',
      state: 'Kerala',
      stateCode: '32',
      mobile: '+91 9847012347',
      email: 'ads@wyenfos.com',
      website: 'www.wyenfosads.com',
      logo: '/uploads/wyenfos_ads.png',
      qrCode: '/uploads/bank-qr-codes/COMBINED_WYENFOS_1755333147704.png',
      prefix: 'WAD'
    },
    'WYENFOS CASH VAPASE': {
      name: 'WYENFOS CASH VAPASE',
      address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
      GSTIN: '32AAECW1234B1Z3',
      state: 'Kerala',
      stateCode: '32',
      mobile: '+91 9847012348',
      email: 'vapase@wyenfos.com',
      website: 'www.wyenfosvapase.com',
      logo: '/uploads/wyenfos_cash.png',
      qrCode: '/uploads/bank-qr-codes/COMBINED_WYENFOS_CASH_VAPASE_1755490549175.png',
      prefix: 'WCV'
    },
    'AYUR FOR HERBALS INDIA': {
      name: 'AYUR FOR HERBALS INDIA',
      address: 'Ayur4Life Building, Thrissur, Kerala, 680001',
      GSTIN: '32AAECW1234B1Z4',
      state: 'Kerala',
      stateCode: '32',
      mobile: '+91 9847012349',
      email: 'info@ayur4life.com',
      website: 'www.ayur4life.com',
      logo: '/uploads/Ayur4life_logo.png',
      qrCode: '/uploads/bank-qr-codes/COMBINED_WYENFOS_1755333147704.png',
      prefix: 'ALH'
    },
    'WYENFOS': {
      name: 'WYENFOS',
      address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
      GSTIN: '32AAECW1234B1Z5',
      state: 'Kerala',
      stateCode: '32',
      mobile: '+91 9847012350',
      email: 'contact@wyenfos.com',
      website: 'www.wyenfos.com',
      logo: '/uploads/wyenfos.png',
      qrCode: '/uploads/bank-qr-codes/WYENFOS_QR_1755336487474.png',
      prefix: 'WNF'
    },
    'WYENFOS PURE DROPS': {
      name: 'WYENFOS PURE DROPS',
      address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
      GSTIN: '32AAECW1234B1Z6',
      state: 'Kerala',
      stateCode: '32',
      mobile: '+91 9847012351',
      email: 'drops@wyenfos.com',
      website: 'www.wyenfospuredrops.com',
      logo: '/uploads/wyenfos pure drops.png',
      qrCode: '/uploads/bank-qr-codes/COMBINED_WYENFOS_1755333147704.png',
      prefix: 'WPD'
    },
  };

  // Handle company name mapping for backward compatibility
  if (companyName === 'AYUR 4 LIFE HERBALS India') {
    companyName = 'AYUR FOR HERBALS INDIA';
  }
  if (companyName === 'WYENFOS GOLD & DIAMONDS') {
    companyName = 'WYENFOS GOLD AND DIAMONDS';
  }

  return companyDetails[companyName] || {
    name: companyName || 'WYENFOS',
    address: 'Thekkekara Arcade, Chelakottukara, Thrissur, Kerala, 680001',
    GSTIN: '32AAECW1234B1Z0',
    state: 'Kerala',
    stateCode: '32',
    mobile: '',
    email: '',
    website: '',
    logo: '/uploads/wyenfos.png',
    qrCode: '/uploads/bank-qr-codes/WYENFOS_QR_1755336487474.png',
    prefix: 'WNF'
  };
};
