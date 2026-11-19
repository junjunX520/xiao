/**
 * WEN/JUN template content.
 *
 * Replace the values below with your own studio information. Keep the same
 * top-level keys so the immersive scene can continue to generate itself.
 */
export const studioConfig = {
  brand: {
    name: 'WEN/JUN',
    mark: 'W/J',
    descriptor: 'Independent creative practice',
    metaTitle: 'WEN/JUN — Digital Worlds & Creative Technology',
    metaDescription:
      'A configurable WebGL portfolio template for creative studios working across direction, design, motion and technology.',
  },
  theme: {
    background: '#020604',
    foreground: '#edf9f2',
    muted: '#90a59b',
    accent: '#76e6ff',
    secondary: '#d5ff64',
  },
  nav: [
    { label: 'Work', href: '#work', index: '01' },
    { label: 'Studio', href: '#studio', index: '02' },
    { label: 'Contact', href: '#contact', index: '03' },
  ],
  hero: {
    eyebrow: 'Creative technology / Digital experiences',
    lines: ['CREATIVE', 'DIGITAL', 'EXPERIENCES'],
    tail: '',
    aside: [
      'Independent creative practice',
      'We combine story, design & technology',
      'to build digital experiences beyond the screen.',
    ],
    intro:
      '融合故事、设计与技术，创造超越屏幕的数字体验。',
    scrollLabel: 'Scroll to enter',
    availability: 'Available for selected projects',
  },
  projects: [
    {
      id: 'aether-field',
      title: 'Aether Field',
      client: 'Kinetic Research',
      year: '2026',
      category: 'Digital ecosystem',
      summary:
        '一个会随观看者改变形状的实时品牌空间。把抽象研究转化成可被探索的光场、声音与数据形态。',
      services: ['Art Direction', 'WebGL', 'Sound Design'],
      image: '/media/blue-current.webp',
      accent: '#76e6ff',
    },
    {
      id: 'tide-engine',
      title: 'Tide Engine',
      client: 'Pacific Futures',
      year: '2025',
      category: 'Generative campaign',
      summary:
        '以潮汐数据驱动生成影像与交互装置，让一组无法被看见的环境变化拥有可感知的节奏。',
      services: ['Creative Direction', 'Generative System', 'Film'],
      image: '/media/tide-engine-fuji.jpg',
      accent: '#d5ff64',
    },
    {
      id: 'common-ground',
      title: 'Common Ground',
      client: 'Field Notes',
      year: '2025',
      category: 'Brand world',
      summary:
        '为跨学科文化平台建立开放、持续生长的视觉系统，让每次发布都像新的入口。',
      services: ['Identity', 'Type System', 'Digital Experience'],
      image: '/media/common-ground-blossoms.jpg',
      accent: '#ff9d78',
    },
    {
      id: 'afterimage',
      title: 'Afterimage',
      client: 'Nocturne',
      year: '2024',
      category: 'Immersive installation',
      summary:
        '一个围绕记忆残像展开的空间体验，观众的动作会改变画面的衰减方式与颜色。',
      services: ['Concept', 'Spatial Design', 'Real-time 3D'],
      image: '/media/afterimage-blossom-poster.jpg',
      accent: '#c3a5ff',
    },
  ],
  studio: {
    kicker: 'A practice between systems / 体系之间',
    statement:
      'WE SHAPE STRATEGY INTO FORM, AND BRANDS INTO WORLDS.',
    statementCn: '以设计、动态与代码，构筑品牌的精神场域。',
    note:
      '从策略到落地，以同一套视觉语言贯穿每一次触达。\nFrom strategy to launch, one visual language across every touchpoint.',
    services: [
      {
        title: 'Creative Direction',
        titleCn: '创意方向',
        copy: '定义品牌的叙事、审美与体验原则。',
      },
      {
        title: 'Digital Experiences',
        titleCn: '数字体验',
        copy: '构建网站、产品与空间界面的完整体验。',
      },
      {
        title: 'Motion & 3D',
        titleCn: '动态与三维',
        copy: '以材质、镜头与声音建立可感知的空间。',
      },
      {
        title: 'Technology',
        titleCn: '技术实现',
        copy: '实时图形、交互原型与高性能前端开发。',
      },
    ],
    stats: [
      { value: '12', label: 'Years in practice / 持续实践' },
      { value: '48', label: 'Worlds shipped / 项目落地' },
      { value: '07', label: 'Collaborators / 核心协作' },
    ],
  },
  contact: {
    eyebrow: 'Start a new world',
    lines: ['HOW TO', 'CONTACT ME'],
    email: 'junwenxiao520@gmail.com',
    location: 'Shanghai / CN',
    availability: 'Open for Q1 2027',
    socials: [
      { label: 'Instagram', href: '#' },
      { label: 'Behance', href: '#' },
      { label: 'Are.na', href: '#' },
    ],
  },
  settings: {
    introDuration: 3600,
    soundEnabled: true,
  },
};
