const request = require('supertest');
const app = require('../index');
const axios = require('axios');

jest.mock('axios');

// Helper to clear cache between tests
const clearPokemonCache = () => {
  // Clear require cache to get fresh module
  delete require.cache[require.resolve('../routes/pokemon')];
  const pokemonRoutes = require('../routes/pokemon');
  if (pokemonRoutes.__cache) {
    pokemonRoutes.__cache.clear();
  }
};

describe('Pokemon Routes', () => {
  let authToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });
    authToken = res.body.data.token;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    clearPokemonCache();
  });

  describe('GET /api/pokemons', () => {
    it('should return paginated list of pokemon', async () => {
      const mockPokemonList = {
        data: {
          results: [
            { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
            { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' }
          ]
        }
      };

      const mockPokemonDetail = {
        data: {
          id: 1,
          name: 'bulbasaur',
          sprites: {
            front_default: 'https://example.com/bulbasaur.png',
            other: {
              'official-artwork': {
                front_default: 'https://example.com/bulbasaur-art.png'
              }
            }
          },
          types: [{ type: { name: 'grass' } }, { type: { name: 'poison' } }]
        }
      };

      axios.get
        .mockResolvedValueOnce(mockPokemonList)
        .mockResolvedValueOnce(mockPokemonDetail)
        .mockResolvedValueOnce(mockPokemonDetail);

      const res = await request(app)
        .get('/api/pokemons?limit=2&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(2);
    });

    it('should filter pokemon by search term', async () => {
      const mockPokemonList = {
        data: {
          results: [
            { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' },
            { name: 'charmeleon', url: 'https://pokeapi.co/api/v2/pokemon/5/' },
            { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' }
          ]
        }
      };

      const mockCharmander = {
        data: {
          id: 4,
          name: 'charmander',
          sprites: {
            front_default: 'https://example.com/charmander.png',
            other: {
              'official-artwork': {
                front_default: 'https://example.com/charmander-art.png'
              }
            }
          },
          types: [{ type: { name: 'fire' } }]
        }
      };

      const mockCharmeleon = {
        data: {
          id: 5,
          name: 'charmeleon',
          sprites: {
            front_default: 'https://example.com/charmeleon.png',
            other: {
              'official-artwork': {
                front_default: 'https://example.com/charmeleon-art.png'
              }
            }
          },
          types: [{ type: { name: 'fire' } }]
        }
      };

      axios.get.mockImplementation((url) => {
        if (url.includes('pokemon?limit=1500')) {
          return Promise.resolve(mockPokemonList);
        }
        if (url.includes('pokemon/charmander')) {
          return Promise.resolve(mockCharmander);
        }
        if (url.includes('pokemon/charmeleon')) {
          return Promise.resolve(mockCharmeleon);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const res = await request(app)
        .get('/api/pokemons?search=char')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results.length).toBeGreaterThan(0);
      expect(res.body.data.results[0].name).toContain('char');
    });

    it('should support multiple search terms', async () => {
      const mockPokemonList = {
        data: {
          results: [
            { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' },
            { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' }
          ]
        }
      };

      const mockCharmander = {
        data: {
          id: 4,
          name: 'charmander',
          sprites: {
            front_default: 'https://example.com/charmander.png',
            other: {
              'official-artwork': {
                front_default: 'https://example.com/charmander-art.png'
              }
            }
          },
          types: [{ type: { name: 'fire' } }]
        }
      };

      const mockPikachu = {
        data: {
          id: 25,
          name: 'pikachu',
          sprites: {
            front_default: 'https://example.com/pikachu.png',
            other: {
              'official-artwork': {
                front_default: 'https://example.com/pikachu-art.png'
              }
            }
          },
          types: [{ type: { name: 'electric' } }]
        }
      };

      axios.get.mockImplementation((url) => {
        if (url.includes('pokemon?limit=1500')) {
          return Promise.resolve(mockPokemonList);
        }
        if (url.includes('pokemon/charmander')) {
          return Promise.resolve(mockCharmander);
        }
        if (url.includes('pokemon/pikachu')) {
          return Promise.resolve(mockPikachu);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const res = await request(app)
        .get('/api/pokemons?search=char,pika')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should sort by name', async () => {
      const mockPokemonList = {
        data: {
          results: [
            { name: 'zubat', url: 'https://pokeapi.co/api/v2/pokemon/41/' },
            { name: 'abra', url: 'https://pokeapi.co/api/v2/pokemon/63/' }
          ]
        }
      };

      const mockPokemonDetail = {
        data: {
          id: 1,
          name: 'test',
          sprites: {
            front_default: 'https://example.com/test.png',
            other: {
              'official-artwork': {
                front_default: 'https://example.com/test-art.png'
              }
            }
          },
          types: [{ type: { name: 'normal' } }]
        }
      };

      axios.get
        .mockResolvedValueOnce(mockPokemonList)
        .mockResolvedValueOnce(mockPokemonDetail)
        .mockResolvedValueOnce(mockPokemonDetail);

      const res = await request(app)
        .get('/api/pokemons?sortBy=name&sortOrder=asc')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/pokemons');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should handle errors', async () => {
      axios.get.mockImplementation(() => {
        return Promise.reject({ message: 'Network error' });
      });

      const res = await request(app)
        .get('/api/pokemons')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/pokemons/number/:numbers', () => {
    it('should return pokemon by number', async () => {
      const mockPokemonList = {
        data: {
          results: [
            { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
            { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
            { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' },
            { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' }
          ]
        }
      };

      const mockPokemonDetail = {
        data: {
          id: 4,
          name: 'charmander',
          sprites: {
            front_default: 'https://example.com/charmander.png',
            other: {
              'official-artwork': {
                front_default: 'https://example.com/charmander-art.png'
              }
            }
          },
          types: [{ type: { name: 'fire' } }]
        }
      };

      axios.get.mockImplementation((url) => {
        if (url.includes('pokemon?limit=1500')) {
          return Promise.resolve(mockPokemonList);
        }
        if (url.includes('pokemon/charmander')) {
          return Promise.resolve(mockPokemonDetail);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const res = await request(app)
        .get('/api/pokemons/number/4')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.results[0].number).toBe(4);
    });

    it('should support multiple numbers', async () => {
      const mockPokemonList = {
        data: {
          results: [
            { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
            { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
            { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' },
            { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' }
          ]
        }
      };

      const mockBulbasaur = {
        data: {
          id: 1,
          name: 'bulbasaur',
          sprites: {
            front_default: 'https://example.com/bulbasaur.png',
            other: {
              'official-artwork': {
                front_default: 'https://example.com/bulbasaur-art.png'
              }
            }
          },
          types: [{ type: { name: 'grass' } }]
        }
      };

      const mockCharmander = {
        data: {
          id: 4,
          name: 'charmander',
          sprites: {
            front_default: 'https://example.com/charmander.png',
            other: {
              'official-artwork': {
                front_default: 'https://example.com/charmander-art.png'
              }
            }
          },
          types: [{ type: { name: 'fire' } }]
        }
      };

      axios.get.mockImplementation((url) => {
        if (url.includes('pokemon?limit=1500')) {
          return Promise.resolve(mockPokemonList);
        }
        if (url.includes('pokemon/bulbasaur')) {
          return Promise.resolve(mockBulbasaur);
        }
        if (url.includes('pokemon/charmander')) {
          return Promise.resolve(mockCharmander);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const res = await request(app)
        .get('/api/pokemons/number/1,4')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results.length).toBe(2);
    });

    it('should handle zero-padded numbers', async () => {
      const mockPokemonList = {
        data: {
          results: [
            { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
            { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
            { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon/3/' },
            { name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' }
          ]
        }
      };

      const mockPokemonDetail = {
        data: {
          id: 4,
          name: 'charmander',
          sprites: {
            front_default: 'https://example.com/charmander.png',
            other: {
              'official-artwork': {
                front_default: 'https://example.com/charmander-art.png'
              }
            }
          },
          types: [{ type: { name: 'fire' } }]
        }
      };

      axios.get.mockImplementation((url) => {
        if (url.includes('pokemon?limit=1500')) {
          return Promise.resolve(mockPokemonList);
        }
        if (url.includes('pokemon/charmander')) {
          return Promise.resolve(mockPokemonDetail);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const res = await request(app)
        .get('/api/pokemons/number/004')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toHaveLength(1);
    });

    it('should return empty results for non-existent numbers', async () => {
      const mockPokemonList = {
        data: {
          results: []
        }
      };

      axios.get.mockResolvedValueOnce(mockPokemonList);

      const res = await request(app)
        .get('/api/pokemons/number/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toHaveLength(0);
    });

    it('should reject invalid numbers', async () => {
      const res = await request(app)
        .get('/api/pokemons/number/invalid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/pokemons/:id', () => {
    it('should return detailed pokemon information', async () => {
      const mockPokemon = {
        data: {
          id: 4,
          name: 'charmander',
          sprites: {
            front_default: 'https://example.com/charmander.png',
            back_default: 'https://example.com/charmander-back.png',
            front_shiny: 'https://example.com/charmander-shiny.png',
            back_shiny: 'https://example.com/charmander-back-shiny.png',
            other: {
              'official-artwork': {
                front_default: 'https://example.com/charmander-art.png'
              }
            }
          },
          types: [{ type: { name: 'fire' } }],
          height: 6,
          weight: 85,
          abilities: [
            { ability: { name: 'blaze' }, is_hidden: false }
          ],
          moves: [
            {
              move: { name: 'scratch' },
              version_group_details: [
                { move_learn_method: { name: 'level-up' } }
              ]
            }
          ],
          stats: [
            { stat: { name: 'hp' }, base_stat: 39 }
          ]
        }
      };

      const mockSpecies = {
        data: {
          varieties: [
            { pokemon: { name: 'charmander' }, is_default: true }
          ],
          flavor_text_entries: [
            {
              language: { name: 'en' },
              flavor_text: 'It has a preference for hot things.'
            }
          ],
          genera: [
            {
              language: { name: 'en' },
              genus: 'Lizard Pokémon'
            }
          ],
          habitat: { name: 'mountain' },
          generation: { name: 'generation-i' }
        }
      };

      axios.get.mockImplementation((url) => {
        if (url.includes('pokemon/4') && !url.includes('pokemon-species')) {
          return Promise.resolve(mockPokemon);
        }
        if (url.includes('pokemon-species/4')) {
          return Promise.resolve(mockSpecies);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const res = await request(app)
        .get('/api/pokemons/4')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(4);
      expect(res.body.data.name).toBe('charmander');
      expect(res.body.data.types).toContain('fire');
      expect(res.body.data.height).toBe(0.6);
      expect(res.body.data.weight).toBe(8.5);
      expect(res.body.data.description).toBe('It has a preference for hot things.');
    });

    it('should handle alternate forms without species', async () => {
      const mockPokemon = {
        data: {
          id: 10026,
          name: 'pikachu-gmax',
          sprites: {
            front_default: 'https://example.com/pikachu-gmax.png',
            back_default: null,
            front_shiny: null,
            back_shiny: null,
            other: {
              'official-artwork': {
                front_default: 'https://example.com/pikachu-gmax-art.png'
              }
            }
          },
          types: [{ type: { name: 'electric' } }],
          height: 4,
          weight: 60,
          abilities: [],
          moves: [],
          stats: [],
          species: {
            url: 'https://pokeapi.co/api/v2/pokemon-species/25/'
          }
        }
      };

      const mockSpecies = {
        data: {
          varieties: [],
          flavor_text_entries: [],
          genera: [],
          habitat: null,
          generation: { name: 'generation-i' }
        }
      };

      axios.get.mockImplementation((url) => {
        if (url.includes('pokemon/10026') && !url.includes('pokemon-species')) {
          return Promise.resolve(mockPokemon);
        }
        if (url.includes('pokemon-species/10026')) {
          return Promise.reject({ response: { status: 404 } });
        }
        if (url.includes('pokemon-species/25')) {
          return Promise.resolve(mockSpecies);
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const res = await request(app)
        .get('/api/pokemons/10026')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(10026);
    });

    it('should reject invalid id', async () => {
      const res = await request(app)
        .get('/api/pokemons/invalid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent pokemon', async () => {
      const error = {
        response: { status: 404 },
        message: 'Not found'
      };
      axios.get.mockImplementation(() => {
        return Promise.reject(error);
      });

      const res = await request(app)
        .get('/api/pokemons/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Pokemon not found');
    });
  });
});

