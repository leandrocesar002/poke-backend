const express = require('express');
const axios = require('axios');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const POKEAPI_BASE = 'https://pokeapi.co/api/v2';

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedOrFetch = async (key, fetchFn) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const data = await fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
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

    // Filter by search term
    let filtered = allPokemon;
    if (search) {
      filtered = allPokemon.filter(p =>
        p.name.includes(search) || p.number.toString().includes(search)
      );
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
        return getCachedOrFetch(`pokemon-${p.number}`, async () => {
          const response = await axios.get(`${POKEAPI_BASE}/pokemon/${p.number}`);
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
      const [pokemon, species] = await Promise.all([
        axios.get(`${POKEAPI_BASE}/pokemon/${id}`),
        axios.get(`${POKEAPI_BASE}/pokemon-species/${id}`)
      ]);

      return {
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
        height: pokemon.data.height / 10, // Convert to meters
        weight: pokemon.data.weight / 10, // Convert to kg
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
        })),
        forms: species.data.varieties.map(v => ({
          name: v.pokemon.name,
          isDefault: v.is_default
        })),
        description: species.data.flavor_text_entries
          .find(e => e.language.name === 'en')?.flavor_text
          .replace(/\f/g, ' ') || 'No description available',
        genus: species.data.genera
          .find(g => g.language.name === 'en')?.genus || 'Unknown',
        habitat: species.data.habitat?.name || 'Unknown',
        generation: species.data.generation.name
      };
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


