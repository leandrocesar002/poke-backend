const express = require('express');
const axios = require('axios');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const POKEAPI_BASE = 'https://pokeapi.co/api/v2';

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Export cache for testing
if (process.env.NODE_ENV === 'test') {
  module.exports.__cache = cache;
}

const getCachedOrFetch = async (key, fetchFn) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const data = await fetchFn();

  if (data && (Array.isArray(data) ? data.length > 0 : true)) {
    cache.set(key, { data, timestamp: Date.now() });
  }
  return data;
};

/**
 * GET /api/pokemons
 * Returns paginated list of Pokémon
 * Query params: limit, offset, search, sortBy (name|number), sortOrder (asc|desc)
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search?.toLowerCase() || '';
    const sortBy = req.query.sortBy || 'number';
    const sortOrder = req.query.sortOrder || 'asc';

    // Fetch all pokemon names for search/sort functionality
    const allPokemon = await getCachedOrFetch('all-pokemon', async () => {
      const response = await axios.get(`${POKEAPI_BASE}/pokemon?limit=1500`);
      return response.data.results.map((p, index) => ({
        name: p.name,
        number: index + 1,
        url: p.url
      }));
    });

    let filtered;
    if (search && search.trim().length > 0) {
      const searchTerms = search.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
      filtered = allPokemon.filter(p => 
        searchTerms.some(term => p.name.indexOf(term) !== -1)
      );
    } else {
      filtered = [...allPokemon];
    }

    // Sort
    filtered.sort((a, b) => {
      const compareValue = sortBy === 'name'
        ? a.name.localeCompare(b.name)
        : a.number - b.number;
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    // Paginate
    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    // Fetch details for paginated results
    const pokemonDetails = await Promise.all(
      paginated.map(async (p) => {
        return getCachedOrFetch(`pokemon-${p.name}`, async () => {
          const response = await axios.get(`${POKEAPI_BASE}/pokemon/${p.name}`);
          return {
            id: response.data.id,
            name: response.data.name,
            number: response.data.id,
            image: response.data.sprites.other['official-artwork'].front_default ||
                   response.data.sprites.front_default,
            types: response.data.types.map(t => t.type.name)
          };
        });
      })
    );

    res.json({
      success: true,
      data: {
        results: pokemonDetails,
        pagination: {
          total,
          limit,
          offset,
          hasNext: offset + limit < total,
          hasPrev: offset > 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pokemons/number/:numbers
 * Returns Pokémon by number(s) - supports multiple numbers separated by comma
 * Examples: /number/4, /number/004, /number/1,4,25
 */
router.get('/number/:numbers', authMiddleware, async (req, res, next) => {
  try {
    const { numbers } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    if (!numbers) {
      return res.status(400).json({
        success: false,
        error: 'Number parameter is required'
      });
    }

    const searchNumbers = numbers
      .split(',')
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n));

    if (searchNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one valid number is required'
      });
    }

    const allPokemon = await getCachedOrFetch('all-pokemon', async () => {
      const response = await axios.get(`${POKEAPI_BASE}/pokemon?limit=1500`);
      return response.data.results.map((p, index) => ({
        name: p.name,
        number: index + 1,
        url: p.url
      }));
    });

    const filtered = allPokemon.filter(p => searchNumbers.includes(p.number));

    if (filtered.length === 0) {
      return res.json({
        success: true,
        data: {
          results: [],
          pagination: { total: 0, limit, offset, hasNext: false, hasPrev: false }
        }
      });
    }

    filtered.sort((a, b) => searchNumbers.indexOf(a.number) - searchNumbers.indexOf(b.number));

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    const pokemonDetails = await Promise.all(
      paginated.map(async (p) => {
        return getCachedOrFetch(`pokemon-${p.name}`, async () => {
          const response = await axios.get(`${POKEAPI_BASE}/pokemon/${p.name}`);
          return {
            id: response.data.id,
            name: response.data.name,
            number: response.data.id,
            image: response.data.sprites.other['official-artwork'].front_default ||
                   response.data.sprites.front_default,
            types: response.data.types.map(t => t.type.name)
          };
        });
      })
    );

    res.json({
      success: true,
      data: {
        results: pokemonDetails,
        pagination: { total, limit, offset, hasNext: offset + limit < total, hasPrev: offset > 0 }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/pokemons/:id
 * Returns detailed information about a specific Pokémon
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid Pokemon ID is required'
      });
    }

    const pokemonData = await getCachedOrFetch(`pokemon-detail-${id}`, async () => {
      const pokemon = await axios.get(`${POKEAPI_BASE}/pokemon/${id}`);
      
      let species = null;
      try {
        species = await axios.get(`${POKEAPI_BASE}/pokemon-species/${id}`);
      } catch (speciesError) {
        if (pokemon.data.species?.url) {
          species = await axios.get(pokemon.data.species.url);
        }
      }

      const result = {
        id: pokemon.data.id,
        name: pokemon.data.name,
        number: pokemon.data.id,
        image: pokemon.data.sprites.other['official-artwork'].front_default ||
               pokemon.data.sprites.front_default,
        images: {
          front: pokemon.data.sprites.front_default,
          back: pokemon.data.sprites.back_default,
          frontShiny: pokemon.data.sprites.front_shiny,
          backShiny: pokemon.data.sprites.back_shiny,
          artwork: pokemon.data.sprites.other['official-artwork'].front_default
        },
        types: pokemon.data.types.map(t => t.type.name),
        height: pokemon.data.height / 10,
        weight: pokemon.data.weight / 10,
        abilities: pokemon.data.abilities.map(a => ({
          name: a.ability.name,
          isHidden: a.is_hidden
        })),
        moves: pokemon.data.moves.slice(0, 20).map(m => ({
          name: m.move.name,
          learnMethod: m.version_group_details[0]?.move_learn_method.name
        })),
        stats: pokemon.data.stats.map(s => ({
          name: s.stat.name,
          value: s.base_stat
        }))
      };

      if (species?.data) {
        result.forms = species.data.varieties?.map(v => ({
          name: v.pokemon.name,
          isDefault: v.is_default
        })) || [];
        result.description = species.data.flavor_text_entries
          ?.find(e => e.language.name === 'en')?.flavor_text
          ?.replace(/\f/g, ' ') || 'No description available';
        result.genus = species.data.genera
          ?.find(g => g.language.name === 'en')?.genus || 'Unknown';
        result.habitat = species.data.habitat?.name || 'Unknown';
        result.generation = species.data.generation?.name || 'Unknown';
      } else {
        result.forms = [];
        result.description = 'No description available';
        result.genus = 'Unknown';
        result.habitat = 'Unknown';
        result.generation = 'Unknown';
      }

      return result;
    });

    res.json({
      success: true,
      data: pokemonData
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Pokemon not found'
      });
    }
    next(error);
  }
});

module.exports = router;

// Export cache for testing
if (process.env.NODE_ENV === 'test') {
  module.exports.__cache = cache;
}


