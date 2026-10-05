import { Team } from './types';

export interface GeneratedMatch {
  matchday: number;
  home_team_id: string;
  away_team_id: string;
  round?: string;
}

// 1. Generator Liga (Round Robin)
export function generateFixtures(teams: Team[], homeAway: boolean = true): GeneratedMatch[] {
  if (teams.length < 2) return [];

  const teamList = [...teams];
  if (teamList.length % 2 !== 0) {
    teamList.push({
      id: 'BYE',
      tournament_id: teams[0].tournament_id,
      name: 'BYE',
      logo_url: null,
      created_at: '',
    });
  }

  const numTeams = teamList.length;
  const rounds = numTeams - 1;
  const half = numTeams / 2;
  const fixtures: GeneratedMatch[] = [];

  const teamIndices = teamList.map((_, i) => i);

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const homeIdx = teamIndices[i];
      const awayIdx = teamIndices[numTeams - 1 - i];

      if (teamList[homeIdx].id !== 'BYE' && teamList[awayIdx].id !== 'BYE') {
        fixtures.push({
          matchday: round + 1,
          home_team_id: teamList[homeIdx].id,
          away_team_id: teamList[awayIdx].id,
          round: 'League',
        });
      }
    }
    teamIndices.splice(1, 0, teamIndices.pop()!);
  }

  if (homeAway) {
    const leg1Count = fixtures.length;
    for (let i = 0; i < leg1Count; i++) {
      const match = fixtures[i];
      fixtures.push({
        matchday: match.matchday + rounds,
        home_team_id: match.away_team_id,
        away_team_id: match.home_team_id,
        round: 'League',
      });
    }
  }

  return fixtures;
}

// 2. Generator Turnamen Gugur (Knockout Cup)
export function generateCupBracket(teams: Team[]): GeneratedMatch[] {
  if (teams.length < 2) return [];
  const fixtures: GeneratedMatch[] = [];

  // Ronde Pertama: Pasangkan tim secara berurutan
  const totalRounds = Math.ceil(Math.log2(teams.length));
  
  for (let i = 0; i < teams.length; i += 2) {
    if (teams[i + 1]) {
      const roundName = teams.length <= 4 ? 'Semi Final' : teams.length <= 8 ? 'Quarter Final' : 'Round 1';
      fixtures.push({
        matchday: 1,
        home_team_id: teams[i].id,
        away_team_id: teams[i + 1].id,
        round: roundName,
      });
    }
  }

  return fixtures;
}
