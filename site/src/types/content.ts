export interface SectionEntry {
  id: string
  title: string
  body: string
  code: string
  imageCaption: string
  imageAlt: string
}

export interface SiteContent {
  tagline: string
  subtitle: string
  githubUrl?: string
  templateRepoUrl?: string
  sections: SectionEntry[]
  thankYou: {
    title: string
    body: string
    signature: string
  }
}
