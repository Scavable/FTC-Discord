import RoleMapper from '../src/utility/RoleMapper';

// Minimal mocks for discord.js types
class MockRole {
  constructor(public id: string, public name: string) {}
}

class MockRolesManager {
  private roles: MockRole[];
  constructor(roles: MockRole[]) {
    this.roles = roles;
  }
  async fetch() {
    // Simulate Collection.forEach by returning an array with forEach
    const arr: any = this.roles;
    arr.forEach = Array.prototype.forEach;
    return arr;
  }
}

class MockGuild {
  roles: MockRolesManager;
  constructor(roles: MockRole[]) {
    this.roles = new MockRolesManager(roles);
  }
}

describe('RoleMapper', () => {
  it('initializes from guild roles and provides accessors', async () => {
    const r1 = new MockRole('1', 'Admin');
    const r2 = new MockRole('2', 'Member');
    const guild = new MockGuild([r1, r2]) as any;

    const mapper = new RoleMapper(guild);
    await mapper.initialize();

    expect(mapper.hasRole('Admin')).toBe(true);
    expect(mapper.getRoleId('Admin')).toBe('1');
    expect(mapper.getRole('Member')?.id).toBe('2');
    expect(mapper.getAllRoles().map(r => r.id).sort()).toEqual(['1', '2']);
  });

  it('returns null for missing roles', async () => {
    const guild = new MockGuild([]) as any;
    const mapper = new RoleMapper(guild);
    await mapper.initialize();
    expect(mapper.hasRole('Nope')).toBe(false);
    expect(mapper.getRole('Nope')).toBeNull();
    expect(mapper.getRoleId('Nope')).toBeNull();
  });
});
