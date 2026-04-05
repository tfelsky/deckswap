import { createAdminClient } from '@/lib/supabase/admin'
import { isPaperPowerNineSchemaMissing } from '@/lib/paper-power-nine'

export type AdminPaperPowerNineSubmissionSummary = {
  id: number
  user_id: string
  credit_name: string
  contact_email?: string | null
  story: string
  theme?: string | null
  status?: string | null
  card_count?: number | null
  exact_match_count?: number | null
  cover_image_url?: string | null
  created_at?: string | null
}

export type AdminPaperPowerNineSubmissionCard = {
  id: number
  submission_id: number
  slot_number: number
  submitted_name: string
  submitted_set_code: string
  submitted_collector_number: string
  requested_finish: string
  exact_print_matched?: boolean | null
  matched_price_usd?: number | null
  card_name?: string | null
  set_code?: string | null
  set_name?: string | null
  collector_number?: string | null
  artist_name?: string | null
  artist_summary?: string | null
  artist_notable_cards?: string[] | null
  top_eight_points?: string[] | null
  image_url?: string | null
  rarity?: string | null
  type_line?: string | null
  color_identity?: string[] | null
  released_at?: string | null
}

export type AdminPaperPowerNineSubmissionDetail = {
  submission: AdminPaperPowerNineSubmissionSummary
  cards: AdminPaperPowerNineSubmissionCard[]
}

export type PaperPowerNineTierRating = {
  tier: 'S' | 'A' | 'B' | 'C'
  label: string
  opinion: string
  score: number
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? ''
}

function safeArray(values?: string[] | null) {
  return Array.isArray(values) ? values.filter((value) => !!normalizeText(value)) : []
}

function formatFinish(value?: string | null) {
  switch (normalizeText(value).toLowerCase()) {
    case 'foil':
      return 'foil'
    case 'etched':
      return 'etched foil'
    default:
      return 'non-foil'
  }
}

function formatTimestampForScript(value?: string | null) {
  if (!value) return 'Recently'

  return new Date(value).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function colorComplexity(colors?: string[] | null) {
  return Array.isArray(colors) ? colors.length : 0
}

function rarityWeight(rarity?: string | null) {
  switch (normalizeText(rarity).toLowerCase()) {
    case 'mythic':
      return 4
    case 'rare':
      return 3
    case 'special':
      return 3
    case 'uncommon':
      return 2
    case 'common':
      return 1
    default:
      return 0
  }
}

function typeExcitement(typeLine?: string | null) {
  const normalized = normalizeText(typeLine).toLowerCase()
  if (!normalized) return 0
  if (normalized.includes('planeswalker')) return 3
  if (normalized.includes('legendary')) return 3
  if (normalized.includes('creature')) return 2
  if (normalized.includes('artifact') || normalized.includes('enchantment')) return 2
  return 1
}

function buildTierRating(card: AdminPaperPowerNineSubmissionCard): PaperPowerNineTierRating {
  const score =
    (card.exact_print_matched ? 3 : 1) +
    rarityWeight(card.rarity) +
    typeExcitement(card.type_line) +
    Math.min(safeArray(card.artist_notable_cards).length, 3) +
    Math.min(safeArray(card.top_eight_points).length, 4) +
    Math.min(colorComplexity(card.color_identity), 3)

  if (score >= 13) {
    return {
      tier: 'S',
      label: 'Episode anchor',
      opinion:
        'This is a slam-dunk inclusion. It feels like one of the cards the whole episode can orbit around because the printing choice is immediately legible and camera-worthy.',
      score,
    }
  }

  if (score >= 10) {
    return {
      tier: 'A',
      label: 'Strong feature pick',
      opinion:
        'This is a really persuasive pick. It may not completely steal the episode, but it absolutely strengthens the identity of the nine and gives the host plenty to talk about.',
      score,
    }
  }

  if (score >= 7) {
    return {
      tier: 'B',
      label: 'Solid supporting pick',
      opinion:
        'This one works, even if it is more of a supporting role. The choice makes sense in context, but it probably needs the personal story to hit harder than the image alone.',
      score,
    }
  }

  return {
    tier: 'C',
    label: 'Needs the story to carry it',
    opinion:
      'This is the kind of pick I would push on in the video. It is not bad, but the collector explanation has to do more work because the printing itself is not instantly overpowering.',
    score,
  }
}

function buildCardSegment(
  card: AdminPaperPowerNineSubmissionCard,
  index: number,
  rating: PaperPowerNineTierRating
) {
  const points = safeArray(card.top_eight_points).slice(0, 4)
  const notableCards = safeArray(card.artist_notable_cards).slice(0, 3)

  const body = [
    `Card ${index + 1} is ${card.card_name || card.submitted_name}, specifically ${card.set_name || card.submitted_set_code.toUpperCase()} ${card.collector_number || card.submitted_collector_number} in ${formatFinish(card.requested_finish)}.`,
    `My take: ${rating.opinion} I am grading it as ${rating.tier}-tier for this specific episode, with the role of ${rating.label.toLowerCase()}.`,
    card.artist_name
      ? `The art here is by ${card.artist_name}, and that matters because ${card.artist_summary || `${card.artist_name} gives this printing a very specific visual identity.`}`
      : 'The artist credit is part of what gives this printing its own personality, even if the broader artist lookup was limited.',
    points.length > 0
      ? `The big review beats are ${points.join(' ')}`
      : `From a review standpoint, this is where I would talk through the printing identity, the finish choice, and why this version beats the other options for this submission.`,
    notableCards.length > 0
      ? `If you know the artist from ${notableCards.join(', ')}, you can already feel the continuity in this pick.`
      : 'Even without a long notable-card list, this pick still works because the visual identity is doing a lot of the heavy lifting.',
  ].join(' ')

  return body
}

export function buildPaperPowerNineVideoScript(detail: AdminPaperPowerNineSubmissionDetail) {
  const submission = detail.submission
  const cards = [...detail.cards].sort((left, right) => left.slot_number - right.slot_number)
  const title = `Personal Power 9 Review: ${submission.credit_name}${submission.theme ? ` | ${submission.theme}` : ''}`
  const tierList = cards.map((card) => ({
    card,
    rating: buildTierRating(card),
  }))
  const tierSummary = tierList
    .slice()
    .sort((left, right) => right.rating.score - left.rating.score)
    .map(
      ({ card, rating }) =>
        `${rating.tier}-tier: ${card.card_name || card.submitted_name} (${rating.label})`
    )
    .join('; ')

  const sections = [
    {
      timestamp: '0:00',
      title: 'Hook + Sponsor Open',
      body: `Welcome back to Mythivex. Today we are breaking down ${submission.credit_name}'s Personal Power 9 submission, recorded ${formatTimestampForScript(submission.created_at)}${submission.theme ? `, built around the theme "${submission.theme}".` : '.'} This series is about the paper printings people love most, not just the most expensive ones. Huge thanks to Mythivex for sponsoring the episode and giving collectors a place to submit their own Personal Power 9, compare printings, and turn great taste into a feature-worthy list.`,
    },
    {
      timestamp: '0:45',
      title: 'Frame The Submission',
      body: `Before we hit the cards, here is the lens for this episode: we are looking for personal taste, visual cohesion, artist identity, memorable print choices, and how well the list tells a story on camera. ${submission.credit_name}'s own framing is: ${submission.story}`,
    },
    {
      timestamp: '1:25',
      title: 'Cards 1-2',
      body: cards
        .slice(0, 2)
        .map((card, index) => buildCardSegment(card, index, tierList[index].rating))
        .join('\n\n'),
    },
    {
      timestamp: '2:45',
      title: 'Cards 3-4',
      body: cards
        .slice(2, 4)
        .map((card, index) => buildCardSegment(card, index + 2, tierList[index + 2].rating))
        .join('\n\n'),
    },
    {
      timestamp: '4:05',
      title: 'Midroll',
      body: `Quick break to thank Mythivex for sponsoring this video. If you spend way too much time thinking about the exact printing, the exact finish, the right art treatment, or the version that actually means something to you, Mythivex is building for that kind of collector. You can submit your own Personal Power 9, keep the print details exact, and give us the story behind the picks so the next episode might be yours.`,
    },
    {
      timestamp: '4:35',
      title: 'Cards 5-6',
      body: cards
        .slice(4, 6)
        .map((card, index) => buildCardSegment(card, index + 4, tierList[index + 4].rating))
        .join('\n\n'),
    },
    {
      timestamp: '5:55',
      title: 'Cards 7-8',
      body: cards
        .slice(6, 8)
        .map((card, index) => buildCardSegment(card, index + 6, tierList[index + 6].rating))
        .join('\n\n'),
    },
    {
      timestamp: '7:15',
      title: 'Card 9 + Submission Read',
      body: `${cards[8] ? buildCardSegment(cards[8], 8, tierList[8].rating) : 'Card nine was unavailable for script generation.'}\n\nAt this point, the bigger question is whether the nine cards feel like a coherent statement, and in this case they do. ${submission.exact_match_count != null ? `${submission.exact_match_count} of the 9 cards matched the exact printing requested during intake, which helps the production side trust the collector intent.` : 'The list still reads like a deliberate statement of taste.'}`,
    },
    {
      timestamp: '8:35',
      title: 'Tier List Verdict',
      body: `If I am evaluating this as a feature segment, I am looking at story density, visual spread, artist variety, and whether each pick earns its place. ${submission.theme ? `The theme "${submission.theme}" gives the episode a strong spine.` : 'The lack of a hard theme actually works here because the picks still feel personally curated.'} My tier list for the nine goes like this: ${tierSummary}. This is the kind of list that rewards closeups, print comparisons, and audience debate.`,
    },
    {
      timestamp: '9:15',
      title: 'Outro + CTA',
      body: `If you enjoyed this one, like the video, share it with another cardboard obsessive, and subscribe for more Personal Power 9 breakdowns. Drop your own top 9 in the comments, or better yet, submit your list on Mythivex so we can review the exact printings, the artists, and the story behind your picks in a future episode. Thanks again to Mythivex for sponsoring the series, and I will see you in the next one.`,
    },
  ]

  const fullScript = sections
    .map((section) => `[${section.timestamp}] ${section.title}\n${section.body}`)
    .join('\n\n')

  return {
    title,
    sections,
    fullScript,
    tierList,
  }
}

export async function loadAdminPaperPowerNineWorkspace(selectedSubmissionId?: number | null) {
  const supabase = createAdminClient()

  const submissionsResult = await supabase
    .from('paper_power_nine_submissions')
    .select(
      'id, user_id, credit_name, contact_email, story, theme, status, card_count, exact_match_count, cover_image_url, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(24)

  if (submissionsResult.error) {
    if (isPaperPowerNineSchemaMissing(submissionsResult.error.message)) {
      return {
        submissions: [] as AdminPaperPowerNineSubmissionSummary[],
        selected: null as AdminPaperPowerNineSubmissionDetail | null,
        schemaMissing: true,
      }
    }

    throw new Error(submissionsResult.error.message)
  }

  const submissions = (submissionsResult.data ?? []) as AdminPaperPowerNineSubmissionSummary[]
  const resolvedSubmissionId =
    selectedSubmissionId && submissions.some((item) => item.id === selectedSubmissionId)
      ? selectedSubmissionId
      : submissions[0]?.id ?? null

  if (!resolvedSubmissionId) {
    return {
      submissions,
      selected: null,
      schemaMissing: false,
    }
  }

  const cardsResult = await supabase
    .from('paper_power_nine_submission_cards')
    .select(
      'id, submission_id, slot_number, submitted_name, submitted_set_code, submitted_collector_number, requested_finish, exact_print_matched, matched_price_usd, card_name, set_code, set_name, collector_number, artist_name, artist_summary, artist_notable_cards, top_eight_points, image_url, rarity, type_line, color_identity, released_at'
    )
    .eq('submission_id', resolvedSubmissionId)
    .order('slot_number', { ascending: true })

  if (cardsResult.error) {
    if (isPaperPowerNineSchemaMissing(cardsResult.error.message)) {
      return {
        submissions,
        selected: null,
        schemaMissing: true,
      }
    }

    throw new Error(cardsResult.error.message)
  }

  const submission = submissions.find((item) => item.id === resolvedSubmissionId) ?? null
  const cards = (cardsResult.data ?? []) as AdminPaperPowerNineSubmissionCard[]

  return {
    submissions,
    selected: submission
      ? {
          submission,
          cards,
        }
      : null,
    schemaMissing: false,
  }
}

export async function loadAdminPaperPowerNineSubmissionDetail(submissionId: number) {
  const supabase = createAdminClient()

  const submissionResult = await supabase
    .from('paper_power_nine_submissions')
    .select(
      'id, user_id, credit_name, contact_email, story, theme, status, card_count, exact_match_count, cover_image_url, created_at'
    )
    .eq('id', submissionId)
    .maybeSingle()

  if (submissionResult.error) {
    if (isPaperPowerNineSchemaMissing(submissionResult.error.message)) {
      return {
        detail: null as AdminPaperPowerNineSubmissionDetail | null,
        schemaMissing: true,
      }
    }

    throw new Error(submissionResult.error.message)
  }

  if (!submissionResult.data) {
    return {
      detail: null,
      schemaMissing: false,
    }
  }

  const cardsResult = await supabase
    .from('paper_power_nine_submission_cards')
    .select(
      'id, submission_id, slot_number, submitted_name, submitted_set_code, submitted_collector_number, requested_finish, exact_print_matched, matched_price_usd, card_name, set_code, set_name, collector_number, artist_name, artist_summary, artist_notable_cards, top_eight_points, image_url, rarity, type_line, color_identity, released_at'
    )
    .eq('submission_id', submissionId)
    .order('slot_number', { ascending: true })

  if (cardsResult.error) {
    if (isPaperPowerNineSchemaMissing(cardsResult.error.message)) {
      return {
        detail: null,
        schemaMissing: true,
      }
    }

    throw new Error(cardsResult.error.message)
  }

  return {
    detail: {
      submission: submissionResult.data as AdminPaperPowerNineSubmissionSummary,
      cards: (cardsResult.data ?? []) as AdminPaperPowerNineSubmissionCard[],
    },
    schemaMissing: false,
  }
}
