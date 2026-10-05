import { Team, Match, StandingRow } from './types';

export function calculateStandings(teams: Team[], matches: Match[]): StandingRow[] {
  const table: Record<string, StandingRow> = {};

  teams.forEach((t) => {
    table[t.id] = {
      team: t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      form: [],
    };
  });

  const completedMatches = matches
    .filter((m) => m.status === 'completed')
    .sort((a, b) => a.matchday - b.matchday);

  completedMatches.forEach((m) => {
    const home = table[m.home_team_id];
    const away = table[m.away_team_id];

    if (!home || !away) return;

    home.played += 1;
    away.played += 1;
    home.gf += m.home_score;
    home.ga += m.away_score;
    away.gf += m.away_score;
    away.ga += m.home_score;

    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (m.home_score > m.away_score) {
      home.won += 1;
      home.points += 3;
      home.form.push('W');

      away.lost += 1;
      away.form.push('L');
    } else if (m.home_score < m.away_score) {
      away.won += 1;
      away.points += 3;
      away.form.push('W');

      home.lost += 1;
      home.form.push('L');
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
      home.form.push('D');
      away.form.push('D');
    }
  });

  return Object.values(table)
    .map((row) => ({
      ...row,
      form: row.form.slice(-5),
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.team.name.localeCompare(b.team.name);
    });
}
