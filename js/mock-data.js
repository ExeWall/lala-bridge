/**
 * LALA Bridge — Mock Data
 *
 * This file simulates a backend database for the MVP.
 * In production, these would be replaced with API calls to a real backend.
 *
 * IMPORTANT: The verificationCodes array simulates the spreadsheet
 * with all Lalíder codes. Replace this with a real database lookup later.
 */

const MockDB = {
  /**
   * Lalíder Verification Codes Database
   * Format: { code, name, camp, country }
   *
   * O uso de um código é derivado das contas cadastradas (Auth.isCodeRegistered),
   * e não de uma flag em memória.
   *
   * In production, this would be an API call to validate against
   * the real spreadsheet/database of Lalíder codes.
   */
  verificationCodes: [
    {
      code: 'LALA-VLB32-001',
      name: 'Larissa Oliveira',
      camp: 'VLB32',
      country: 'BR',
    },
    {
      code: 'LALA-VLB32-002',
      name: 'Carlos Mendoza',
      camp: 'VLB32',
      country: 'CO',
    },
    {
      code: 'LALA-VLB32-003',
      name: 'Ana Beatriz Silva',
      camp: 'VLB32',
      country: 'BR',
    },
    {
      code: 'LALA-VLB32-004',
      name: 'Gabriel Ferreira',
      camp: 'VLB32',
      country: 'BR',
    },
    {
      code: 'LALA-BLB10-001',
      name: 'João Pedro Santos',
      camp: 'BLB10',
      country: 'BR',
    },
    {
      code: 'LALA-BLB10-002',
      name: 'Lucas Fernández',
      camp: 'BLB10',
      country: 'CL',
    },
    {
      code: 'LALA-BLB10-003',
      name: 'Yara Batista',
      camp: 'BLB10',
      country: 'BR',
    },
    {
      code: 'LALA-BLB10-004',
      name: 'Beatriz Almeida',
      camp: 'BLB10',
      country: 'BR',
    },
    {
      code: 'LALA-VLB31-001',
      name: 'Camila Vargas',
      camp: 'VLB31',
      country: 'VE',
    },
    {
      code: 'LALA-VLB31-002',
      name: 'José da Conceição',
      camp: 'VLB31',
      country: 'BR',
    },
    {
      code: 'LALA-BLB09-001',
      name: 'Lucía Castillo',
      camp: 'BLB09',
      country: 'GT',
    },
    {
      code: 'LALA-BLB09-002',
      name: 'Andrés Morales',
      camp: 'BLB09',
      country: 'HN',
    },
  ],

  /**
   * Contas fictícias usadas só no modo demo (LALA_CONFIG.DEMO_MODE).
   * Não têm senha: só podem ser acessadas pelo botão "Entrar como demo".
   */
  demoUsers: [
    {
      id: 'donor-001',
      type: 'donor',
      name: 'Instituto Ponte Digital',
      email: 'donor-001@exemplo.org',
      country: 'BR',
      state: 'SP',
      city: 'São Paulo',
      organization: 'Instituto Ponte Digital',
      demo: true,
      demoLogin: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'donor-002',
      type: 'donor',
      name: 'Mariana Costa',
      email: 'donor-002@exemplo.org',
      country: 'BR',
      state: 'BA',
      city: 'Salvador',
      organization: '',
      demo: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'donor-003',
      type: 'donor',
      name: 'Ipê Sistemas',
      email: 'donor-003@exemplo.org',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
      organization: 'Ipê Sistemas',
      demo: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'donor-004',
      type: 'donor',
      name: 'Mandacaru Labs',
      email: 'donor-004@exemplo.org',
      country: 'BR',
      state: 'CE',
      city: 'Fortaleza',
      organization: 'Mandacaru Labs',
      demo: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'donor-005',
      type: 'donor',
      name: 'Rede Doa Bem',
      email: 'donor-005@exemplo.org',
      country: 'BR',
      state: 'AM',
      city: 'Manaus',
      organization: 'Rede Doa Bem',
      demo: true,
      createdAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'lalider-demo-ana',
      type: 'lalider',
      name: 'Ana Beatriz Silva',
      email: 'lalider-demo-ana@exemplo.org',
      verificationCode: 'LALA-VLB32-003',
      camp: 'VLB32',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
      areaOfInterest: 'tech',
      verified: true,
      demo: true,
      showerSong: 'Anunciação, de Alceu Valença',
      demoLogin: true,
      createdAt: '2026-09-08T00:00:00Z',
    },
    {
      id: 'lalider-sample-larissa',
      type: 'lalider',
      name: 'Larissa Oliveira',
      email: 'lalider-sample-larissa@exemplo.org',
      verificationCode: 'LALA-VLB32-001',
      camp: 'VLB32',
      country: 'BR',
      state: 'SP',
      city: 'São Paulo',
      areaOfInterest: 'engineering',
      verified: true,
      demo: true,
      createdAt: '2026-09-08T00:00:00Z',
    },
    {
      id: 'lalider-sample-joao',
      type: 'lalider',
      name: 'João Pedro Santos',
      email: 'lalider-sample-joao@exemplo.org',
      verificationCode: 'LALA-BLB10-001',
      camp: 'BLB10',
      country: 'BR',
      state: 'BA',
      city: 'Salvador',
      areaOfInterest: 'communications',
      verified: true,
      demo: true,
      createdAt: '2026-09-08T00:00:00Z',
    },
    {
      id: 'lalider-sample-yara',
      type: 'lalider',
      name: 'Yara Batista',
      email: 'lalider-sample-yara@exemplo.org',
      verificationCode: 'LALA-BLB10-003',
      camp: 'BLB10',
      country: 'BR',
      state: 'AM',
      city: 'Manaus',
      areaOfInterest: 'data',
      verified: true,
      demo: true,
      createdAt: '2026-09-08T00:00:00Z',
    },
  ],

  /**
   * Camp options — VLB (Virtual) and BLB (In-person/Blended)
   */
  camps: [
    'VLB32',
    'VLB31',
    'VLB30',
    'VLB29',
    'VLB28',
    'VLB27',
    'VLB26',
    'VLB25',
    'VLB24',
    'VLB23',
    'VLB22',
    'VLB21',
    'VLB20',
    'VLB19',
    'VLB18',
    'VLB17',
    'VLB16',
    'VLB15',
    'VLB14',
    'VLB13',
    'VLB12',
    'VLB11',
    'VLB10',
    'BLB10',
    'BLB09',
    'BLB08',
    'BLB07',
    'BLB06',
    'BLB05',
    'BLB04',
    'BLB03',
    'BLB02',
    'BLB01',
  ],

  /**
   * Países em código ISO 3166-1 alfa-2. O nome é exibido no idioma ativo
   * com Intl.DisplayNames (I18n.countryName). Lalíderes escolhem entre os
   * países da América Latina; doadores, de qualquer um da lista.
   */
  latinAmericaCountries: [
    'BR',
    'AR',
    'BO',
    'CL',
    'CO',
    'CR',
    'CU',
    'DO',
    'EC',
    'SV',
    'GT',
    'HT',
    'HN',
    'MX',
    'NI',
    'PA',
    'PY',
    'PE',
    'UY',
    'VE',
  ],
  otherCountries: ['US', 'CA', 'GB', 'DE', 'FR', 'ES', 'PT', 'IT', 'AU', 'JP'],

  /**
   * Nomes antigos (em inglês) → código ISO. Usado só pela migração v3.
   */
  legacyCountryCodes: {
    Argentina: 'AR',
    Bolivia: 'BO',
    Brazil: 'BR',
    Chile: 'CL',
    Colombia: 'CO',
    'Costa Rica': 'CR',
    Cuba: 'CU',
    'Dominican Republic': 'DO',
    Ecuador: 'EC',
    'El Salvador': 'SV',
    Guatemala: 'GT',
    Haiti: 'HT',
    Honduras: 'HN',
    Mexico: 'MX',
    Nicaragua: 'NI',
    Panama: 'PA',
    Paraguay: 'PY',
    Peru: 'PE',
    Uruguay: 'UY',
    Venezuela: 'VE',
    'United States': 'US',
    Canada: 'CA',
    'United Kingdom': 'GB',
    Germany: 'DE',
    France: 'FR',
    Spain: 'ES',
    Portugal: 'PT',
    Australia: 'AU',
    Japan: 'JP',
  },

  /**
   * Unidades federativas do Brasil.
   */
  brazilStates: [
    { uf: 'AC', name: 'Acre' },
    { uf: 'AL', name: 'Alagoas' },
    { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' },
    { uf: 'BA', name: 'Bahia' },
    { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' },
    { uf: 'ES', name: 'Espírito Santo' },
    { uf: 'GO', name: 'Goiás' },
    { uf: 'MA', name: 'Maranhão' },
    { uf: 'MT', name: 'Mato Grosso' },
    { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' },
    { uf: 'PA', name: 'Pará' },
    { uf: 'PB', name: 'Paraíba' },
    { uf: 'PR', name: 'Paraná' },
    { uf: 'PE', name: 'Pernambuco' },
    { uf: 'PI', name: 'Piauí' },
    { uf: 'RJ', name: 'Rio de Janeiro' },
    { uf: 'RN', name: 'Rio Grande do Norte' },
    { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' },
    { uf: 'RR', name: 'Roraima' },
    { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' },
    { uf: 'SE', name: 'Sergipe' },
    { uf: 'TO', name: 'Tocantins' },
  ],

  /**
   * Áreas de interesse (ids). O texto vem de locales/*.json → areas.<id>.
   */
  areasOfInterest: [
    'tech',
    'business',
    'education',
    'health',
    'environment',
    'social',
    'arts',
    'engineering',
    'law',
    'data',
    'communications',
    'finance',
  ],

  /**
   * Textos antigos (em inglês) → id. Usado só pela migração v3.
   */
  legacyAreaIds: {
    'Technology & Software Development': 'tech',
    'Business & Entrepreneurship': 'business',
    'Education & Teaching': 'education',
    'Healthcare & Medicine': 'health',
    'Environmental Science & Sustainability': 'environment',
    'Social Impact & NGOs': 'social',
    'Arts & Design': 'arts',
    Engineering: 'engineering',
    'Law & Public Policy': 'law',
    'Data Science & AI': 'data',
    'Communications & Marketing': 'communications',
    'Finance & Economics': 'finance',
  },

  /**
   * Equipment categories for donations
   */
  equipmentCategories: [
    {
      id: 'laptop',
      name: 'Laptop / Notebook',
      icon: '💻',
      description: 'Laptops, notebooks, and Chromebooks',
    },
    { id: 'phone', name: 'Smartphone', icon: '📱', description: 'Smartphones and tablets' },
    {
      id: 'headphones',
      name: 'Headphones / Audio',
      icon: '🎧',
      description: 'Headphones, earbuds, microphones',
    },
    {
      id: 'monitor',
      name: 'Monitor / Display',
      icon: '🖥️',
      description: 'External monitors and displays',
    },
    { id: 'peripherals', name: 'Peripherals', icon: '⌨️', description: 'Keyboards, mice, webcams' },
    {
      id: 'books',
      name: 'Books / Learning Materials',
      icon: '📚',
      description: 'Textbooks, courses, subscriptions',
    },
    { id: 'other', name: 'Other', icon: '📦', description: 'Any other study/work equipment' },
  ],

  /**
   * Equipment conditions
   */
  conditions: [
    { id: 'new', label: 'Brand New', description: 'Never used, still in packaging' },
    { id: 'like-new', label: 'Like New', description: 'Barely used, excellent condition' },
    { id: 'good', label: 'Good', description: 'Used but well-maintained, fully functional' },
    { id: 'fair', label: 'Fair', description: 'Shows wear but works properly' },
  ],

  /**
   * Sample donations for demo
   */
  sampleDonations: [
    {
      id: 'don-001',
      donorId: 'donor-001',
      donorName: 'Instituto Ponte Digital',
      category: 'laptop',
      title: 'Notebook Dell Inspiron 15 — 8GB RAM, SSD 256GB',
      description:
        'Usado com cuidado, ótimo para programação e estudos. Acompanha carregador. Windows 11 instalado.',
      condition: 'good',
      country: 'BR',
      state: 'SP',
      city: 'São Paulo',
      status: 'available',
      createdAt: '2026-10-15T10:00:00Z',
      image: null,
      sample: true,
    },
    {
      id: 'don-002',
      donorId: 'donor-002',
      donorName: 'Mariana Costa',
      category: 'phone',
      title: 'Celular Samsung Galaxy A52 — 128GB',
      description:
        'Troquei de aparelho. Bateria em bom estado e câmera ótima para chamadas de vídeo. Acompanha capinha e carregador.',
      condition: 'like-new',
      country: 'BR',
      state: 'BA',
      city: 'Salvador',
      status: 'available',
      createdAt: '2026-10-18T14:30:00Z',
      image: null,
      sample: true,
    },
    {
      id: 'don-003',
      donorId: 'donor-003',
      donorName: 'Ipê Sistemas',
      category: 'headphones',
      title: 'Headset com cancelamento de ruído',
      description: 'Ideal para aulas online e para estudar em casa mesmo com barulho.',
      condition: 'like-new',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
      status: 'matched',
      matchedTo: 'lalider-demo-ana',
      offerId: 'offer-001',
      createdAt: '2026-10-10T09:00:00Z',
      image: null,
      sample: true,
    },
    {
      id: 'don-004',
      donorId: 'donor-001',
      donorName: 'Instituto Ponte Digital',
      category: 'laptop',
      title: 'Notebook Lenovo IdeaPad 3 — 8GB RAM, SSD 256GB',
      description:
        'Equipamento da nossa filial em Recife, revisado pela equipe de TI. Bom para programação, planilhas e design leve.',
      condition: 'good',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
      status: 'available',
      createdAt: '2026-10-20T16:00:00Z',
      image: null,
      sample: true,
    },
    {
      id: 'don-005',
      donorId: 'donor-004',
      donorName: 'Mandacaru Labs',
      category: 'books',
      title: 'Kit de livros de programação (5 livros)',
      description:
        'HTML e CSS, JavaScript, Python, lógica de programação e banco de dados. Todos em português.',
      condition: 'good',
      country: 'BR',
      state: 'CE',
      city: 'Fortaleza',
      status: 'available',
      createdAt: '2026-10-19T11:00:00Z',
      image: null,
      sample: true,
    },
    {
      id: 'don-006',
      donorId: 'donor-005',
      donorName: 'Rede Doa Bem',
      category: 'monitor',
      title: 'Monitor LG 24" Full HD',
      description: 'Monitor extra para quem estuda com duas telas. Acompanha cabo HDMI.',
      condition: 'fair',
      country: 'BR',
      state: 'AM',
      city: 'Manaus',
      status: 'available',
      createdAt: '2026-10-21T08:00:00Z',
      image: null,
      sample: true,
    },
  ],

  /**
   * Sample Lalíder needs/requests
   */
  sampleNeeds: [
    {
      id: 'need-001',
      laliderId: 'lalider-sample-larissa',
      laliderName: 'Larissa O.',
      camp: 'VLB32',
      country: 'BR',
      state: 'SP',
      city: 'São Paulo',
      category: 'laptop',
      title: 'Notebook para estudar engenharia de software',
      description:
        'Comecei a faculdade de engenharia de software e preciso de um notebook que rode IDE e máquina virtual. Qualquer notebook com pelo menos 4GB de RAM já mudaria minha rotina.',
      urgency: 'high',
      status: 'open',
      createdAt: '2026-10-16T12:00:00Z',
      sample: true,
    },
    {
      id: 'need-002',
      laliderId: 'lalider-sample-joao',
      laliderName: 'João S.',
      camp: 'BLB10',
      country: 'BR',
      state: 'BA',
      city: 'Salvador',
      category: 'phone',
      title: 'Celular com boa câmera para estágio remoto',
      description:
        'Passei num estágio remoto, mas meu celular quase não funciona nas videochamadas.',
      urgency: 'medium',
      status: 'open',
      createdAt: '2026-10-17T15:00:00Z',
      sample: true,
    },
    {
      id: 'need-003',
      laliderId: 'lalider-sample-yara',
      laliderName: 'Yara B.',
      camp: 'BLB10',
      country: 'BR',
      state: 'AM',
      city: 'Manaus',
      category: 'headphones',
      title: 'Fone para aulas online',
      description:
        'Divido a casa com a família e um fone com cancelamento de ruído me ajudaria a me concentrar nas aulas.',
      urgency: 'low',
      status: 'open',
      createdAt: '2026-10-18T10:00:00Z',
      sample: true,
    },
    {
      id: 'need-004',
      laliderId: 'lalider-sample-yara',
      laliderName: 'Yara B.',
      camp: 'BLB10',
      country: 'BR',
      state: 'AM',
      city: 'Manaus',
      category: 'laptop',
      title: 'Notebook para ciência de dados',
      description:
        'Quero estudar ciência de dados e IA, mas minha família não tem como comprar um notebook. Até um usado já me permitiria rodar Python e Jupyter.',
      urgency: 'high',
      status: 'open',
      createdAt: '2026-10-19T09:30:00Z',
      sample: true,
    },
    {
      id: 'need-005',
      laliderId: 'lalider-demo-ana',
      laliderName: 'Ana S.',
      camp: 'VLB32',
      country: 'BR',
      state: 'PE',
      city: 'Recife',
      category: 'laptop',
      title: 'Notebook para curso de Python e para mandar currículo',
      description:
        'Hoje estudo pelo celular. Um notebook com pelo menos 8GB de RAM me permitiria terminar meu curso de Python e enviar meu currículo.',
      urgency: 'high',
      status: 'open',
      createdAt: '2026-10-22T09:00:00Z',
      sample: true,
    },
  ],

  /**
   * Ofertas de exemplo (modo demo): um match já aceito para a Lalíder demo.
   */
  sampleOffers: [
    {
      id: 'offer-001',
      needId: null,
      donationId: 'don-003',
      donorId: 'donor-003',
      laliderId: 'lalider-demo-ana',
      initiatedBy: 'lalider',
      message: 'Esse fone vai me ajudar muito nas aulas online.',
      status: 'accepted',
      createdAt: '2026-10-11T09:00:00Z',
      updatedAt: '2026-10-12T09:00:00Z',
      acceptedAt: '2026-10-12T09:00:00Z',
      sample: true,
    },
  ],
};

// Make available globally
window.MockDB = MockDB;
