export interface MatchPayload {
  tournament_id: string;
  matchday: number;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: 'upcoming' | 'completed';
  round?: string;
}

/**
 * Generate jadwal Round-Robin menggunakan algoritma rotasi Berger
 * Mendukung Single Round atau Home & Away (2 Putaran)
 */
export function generateLeagueMatches(
  tournamentId: string,
  teamIds: string[],
  homeAway: boolean = true
): MatchPayload[] {
  const teams = [...teamIds];
  
  // Jika jumlah tim ganjil, tambahkan dummy 'BYE'
  const isOdd = teams.length % 2 !== 0;
  if (isOdd) {
    teams.push('BYE');
  }

  const n = teams.length;
  const totalRounds = n - 1;
  const matchesPerRound = n / 2;
  const roundRobinMatches: { round: number; home: string; away: string }[] = [];

  // Berger tables rotation
  for (let round = 0; round < totalRounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const homeIdx = (round + match) % (n - 1);
      let awayIdx = (n - 1 - match + round) % (n - 1);

      if (match === 0) {
        awayIdx = n - 1;
      }

      let home = teams[homeIdx];
      let away = teams[awayIdx];

      // Selang-seling home/away tiap ronde agar seimbang
      if (round % 2 === 1 && match === 0) {
        [home, away] = [away, home];
      }

      if (home !== 'BYE' && away !== 'BYE') {
        roundRobinMatches.push({ round: round + 1, home, away });
      }
    }
  }

  const result: MatchPayload[] = [];

  // Putaran 1
  roundRobinMatches.forEach((m) => {
    result.push({
      tournament_id: tournamentId,
      matchday: m.round,
      home_team_id: m.home,
      away_team_id: m.away,
      home_score: 0,
      away_score: 0,
      status: 'upcoming',
      round: `Matchday ${m.round}`,
    });
  });

  // Putaran 2 (Home & Away dibalik)
  if (homeAway) {
    roundRobinMatches.forEach((m) => {
      result.push({
        tournament_id: tournamentId,
        matchday: m.round + totalRounds,
        home_team_id: m.away,
        away_team_id: m.home,
        home_score: 0,
        away_score: 0,
        status: 'upcoming',
        round: `Matchday ${m.round + totalRounds}`,
      });
    });
  }

  return result;
}

/**
 * Generate babak pertama Single Elimination Cup (Bagan Sistem Gugur)
 */
export function generateCupBracketMatches(
  tournamentId: string,
  teamIds: string[]
): MatchPayload[] {
  const result: MatchPayload[] = [];
  const count = teamIds.length;

  let roundName = 'Babak 1';
  if (count === 4) roundName = 'Semi Final';
  else if (count === 8) roundName = 'Perempat Final';
  else if (count === 16) roundName = 'Babak 16 Besar';

  for (let i = 0; i < count; i += 2) {
    if (teamIds[i + 1]) {
      result.push({
        tournament_id: tournamentId,
        matchday: 1,
        home_team_id: teamIds[i],
        away_team_id: teamIds[i + 1],
        home_score: 0,
        away_score: 0,
        status: 'upcoming',
        round: roundName,
      });
    }
  }

  return result;
}
