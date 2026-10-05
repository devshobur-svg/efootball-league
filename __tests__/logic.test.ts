import { describe, it, expect } from 'vitest';
import { generateFixtures } from '@/lib/matchmaker';
import { calculateStandings } from '@/lib/standings';
import { Team, Match } from '@/lib/types';

describe('1. Matchmaking Round Robin Generator', () => {
  it('Harus menghasilkan jumlah pertandingan yang tepat untuk 10 tim (Home & Away)', () => {
    const teams: Team[] = Array.from({ length: 10 }, (_, i) => ({
      id: `team-${i + 1}`,
      tournament_id: 'tourney-1',
      name: `Tim ${i + 1}`,
      logo_url: null,
      created_at: new Date().toISOString(),
    }));

    const fixtures = generateFixtures(teams, true);

    // Formula 10 tim Home & Away:
    // Putaran = 2 * (10 - 1) = 18 Matchdays
    // Per matchday = 10 / 2 = 5 Pertandingan
    // Total laga = 18 * 5 = 90 Pertandingan
    expect(fixtures.length).toBe(90);

    const matchdays = new Set(fixtures.map((f) => f.matchday));
    expect(matchdays.size).toBe(18);

    const matchday1 = fixtures.filter((f) => f.matchday === 1);
    expect(matchday1.length).toBe(5);
  });

  it('Harus menangani jumlah tim ganjil dengan BYE secara otomatis', () => {
    const teams: Team[] = Array.from({ length: 5 }, (_, i) => ({
      id: `team-${i + 1}`,
      tournament_id: 'tourney-1',
      name: `Tim ${i + 1}`,
      logo_url: null,
      created_at: new Date().toISOString(),
    }));

    const fixtures = generateFixtures(teams, false);
    expect(fixtures.length).toBe(10);
  });
});

describe('2. Standings & Tie-Breaker Calculation', () => {
  const dummyTeams: Team[] = [
    { id: 't1', tournament_id: '1', name: 'Arsenal', logo_url: null, created_at: '' },
    { id: 't2', tournament_id: '1', name: 'Barcelona', logo_url: null, created_at: '' },
    { id: 't3', tournament_id: '1', name: 'Munchen', logo_url: null, created_at: '' },
  ];

  it('Harus menghitung Poin, GD, dan Form Last 5 dengan akurat', () => {
    const dummyMatches: Match[] = [
      {
        id: 'm1',
        tournament_id: '1',
        matchday: 1,
        home_team_id: 't1',
        away_team_id: 't2',
        home_score: 3,
        away_score: 0,
        status: 'completed',
        played_at: null,
        created_at: '',
      },
      {
        id: 'm2',
        tournament_id: '1',
        matchday: 2,
        home_team_id: 't2',
        away_team_id: 't3',
        home_score: 2,
        away_score: 2,
        status: 'completed',
        played_at: null,
        created_at: '',
      },
      {
        id: 'm3',
        tournament_id: '1',
        matchday: 3,
        home_team_id: 't1',
        away_team_id: 't3',
        home_score: 0,
        away_score: 0,
        status: 'upcoming',
        played_at: null,
        created_at: '',
      },
    ];

    const standings = calculateStandings(dummyTeams, dummyMatches);

    // Arsenal: 1 Main, 1 Menang, Poin 3, GD +3, Form W
    expect(standings[0].team.name).toBe('Arsenal');
    expect(standings[0].points).toBe(3);
    expect(standings[0].gd).toBe(3);
    expect(standings[0].form).toEqual(['W']);

    // Munchen: 1 Main, 1 Seri, Poin 1, GD 0, Form D
    expect(standings[1].team.name).toBe('Munchen');
    expect(standings[1].points).toBe(1);
    expect(standings[1].gd).toBe(0);
    expect(standings[1].form).toEqual(['D']);

    // Barcelona: 2 Main, 1 Seri, 1 Kalah, Poin 1, GD -3, Form L, D
    expect(standings[2].team.name).toBe('Barcelona');
    expect(standings[2].points).toBe(1);
    expect(standings[2].gd).toBe(-3);
    expect(standings[2].form).toEqual(['L', 'D']);
  });

  it('Harus melakukan tie-breaker berdasarkan GD dan GF jika poin sama', () => {
    // Skenario: Tim A dan Tim B punya poin sama (3), tapi Tim A punya GD lebih tinggi
    const tieTeams: Team[] = [
      { id: 'ta', tournament_id: '1', name: 'Tim Alpha', logo_url: null, created_at: '' },
      { id: 'tb', tournament_id: '1', name: 'Tim Beta', logo_url: null, created_at: '' },
      { id: 'tc', tournament_id: '1', name: 'Tim Charlie', logo_url: null, created_at: '' },
    ];

    const tieMatches: Match[] = [
      // Alpha menang 4 - 0 lawan Charlie (Pts: 3, GD: +4, GF: 4)
      {
        id: 'tm1',
        tournament_id: '1',
        matchday: 1,
        home_team_id: 'ta',
        away_team_id: 'tc',
        home_score: 4,
        away_score: 0,
        status: 'completed',
        played_at: null,
        created_at: '',
      },
      // Beta menang 2 - 1 lawan Charlie (Pts: 3, GD: +1, GF: 2)
      {
        id: 'tm2',
        tournament_id: '1',
        matchday: 2,
        home_team_id: 'tb',
        away_team_id: 'tc',
        home_score: 2,
        away_score: 1,
        status: 'completed',
        played_at: null,
        created_at: '',
      },
    ];

    const standings = calculateStandings(tieTeams, tieMatches);

    // Alpha harus peringkat 1 karena GD (+4) > GD Beta (+1)
    expect(standings[0].team.name).toBe('Tim Alpha');
    expect(standings[0].points).toBe(3);
    expect(standings[0].gd).toBe(4);

    expect(standings[1].team.name).toBe('Tim Beta');
    expect(standings[1].points).toBe(3);
    expect(standings[1].gd).toBe(1);

    expect(standings[2].team.name).toBe('Tim Charlie');
    expect(standings[2].points).toBe(0);
  });
});
