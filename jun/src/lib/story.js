const EMPTY_PROJECT = {
  client: '',
  year: '',
  category: '',
  summary: '',
  services: [],
  image: '',
  accent: '#76e6ff',
};

export function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
  if (inMin === inMax) return outMin;
  const progress = clamp01((value - inMin) / (inMax - inMin));
  return outMin + (outMax - outMin) * progress;
}

export function getSceneForProgress(progress) {
  const value = clamp01(progress);
  if (value < 0.25) return 'hero';
  if (value < 0.54) return 'work';
  if (value < 0.8) return 'studio';
  return 'contact';
}

export function normaliseProjects(projects) {
  if (!Array.isArray(projects)) return [];

  return projects
    .filter((project) => project?.id && project?.title)
    .map((project) => ({
      ...EMPTY_PROJECT,
      ...project,
      id: String(project.id),
      title: String(project.title),
      services: Array.isArray(project.services) ? project.services.filter(Boolean) : [],
    }));
}
