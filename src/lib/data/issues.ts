export type Issue = {
  slug: string;
  label: string;
  flower: string;
};

export const ISSUES: Issue[] = [
  {
    slug: 'education',
    label: 'Education & Schools',
    flower: 'Bluebonnet · Lupinus texensis'
  },
  {
    slug: 'healthcare',
    label: 'Healthcare & Caregiving',
    flower: 'Indian Paintbrush · Castilleja indivisa'
  },
  {
    slug: 'work',
    label: 'Work & Making Ends Meet',
    flower: 'Black-eyed Susan · Rudbeckia hirta'
  },
  {
    slug: 'housing',
    label: 'Housing & Staying Put',
    flower: 'Prairie Verbena · Glandularia bipinnatifida'
  },
  {
    slug: 'land',
    label: 'Land, Water & Sky',
    flower: 'Winecup · Callirhoe involucrata'
  },
  {
    slug: 'voice',
    label: 'Voice & Representation',
    flower: 'Indian Blanket · Gaillardia pulchella'
  },
  {
    slug: 'family',
    label: 'Family, Border & Belonging',
    flower: 'Butterfly Weed · Asclepias tuberosa'
  },
  {
    slug: 'bodies',
    label: 'Bodies & Family Decisions',
    flower: 'Pink Evening Primrose · Oenothera speciosa'
  },
  {
    slug: 'safety',
    label: 'Safety in Our Communities',
    flower: 'Blazing Star · Liatris punctata'
  },
  {
    slug: 'community',
    label: 'Community & Belonging',
    flower: 'Texas Sage · Leucophyllum frutescens'
  },
  {
    slug: 'faith',
    label: 'Faith & Tradition',
    flower: 'White Prickly Poppy · Argemone albiflora'
  },
  {
    slug: 'other',
    label: 'Something Else Close to Home',
    flower: 'Mexican Hat · Ratibida columnifera'
  }
];

export const ISSUE_SLUGS = ISSUES.map((i) => i.slug);

/** Map from slug → asset filename, e.g. "flower-education.png" */
export function flowerAsset(slug: string): string {
  return `flower-${slug}.png`;
}
