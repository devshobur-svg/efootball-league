import { describe, it, expect } from 'vitest';
import { generateLeagueMatches, generateCupBracketMatches } from '../lib/tournament-generator';

describe('Tournament Generator Tests', () => {
  it('should generate correct round-robin league matches for 4 teams with home/away', () => {
    const teamIds = ['team-1', 'team-2', 'team-3', 'team-4'];
    const matches = generateLeagueMatches('tourney-1', teamIds, true);
    
    // 4 tim dengan home & away: total match = (4 * 3) / 2 * 2 = 12 laga
    expect(matches.length).toBe(12);
    expect(matches[0].tournament_id).toBe('tourney-1');
    expect(matches[0].status).toBe('upcoming');
  });

  it('should generate correct single elimination cup bracket matches for 4 teams', () => {
    const teamIds = ['team-1', 'team-2', 'team-3', 'team-4'];
    const matches = generateCupBracketMatches('tourney-cup-1', teamIds);
    
    // 4 tim babak pertama (Semi Final) menghasilkan 2 laga
    expect(matches.length).toBe(2);
    expect(matches[0].round).toBe('Semi Final');
    expect(matches[0].matchday).toBe(1);
  });
});
