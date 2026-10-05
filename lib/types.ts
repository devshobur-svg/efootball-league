export type TournamentType = 'league' | 'cup';
export type MatchStatus = 'upcoming' | 'live' | 'completed';

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  logo_url: string | null;
  home_away: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  tournament_id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface MatchGoal {
  id: string;
  tournament_id: string;
  match_id: string;
  team_id: string;
  player_name: string;
  minute?: number | null;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  matchday: number;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: MatchStatus;
  round?: string | null;
  next_match_id?: string | null;
  played_at: string | null;
  created_at: string;
  home_team?: Team;
  away_team?: Team;
  goals?: MatchGoal[];
}

export interface StandingRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface TopScorerRow {
  playerName: string;
  teamName: string;
  teamLogo: string | null;
  goalsCount: number;
}
