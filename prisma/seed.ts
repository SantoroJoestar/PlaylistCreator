/**
 * 🌱 Database Seed Script
 * 
 * Popula o banco de dados com dados iniciais para desenvolvimento
 * Executa após as migrações do Prisma
 */

import { PrismaClient, Platform, Mood, PlaylistType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ==================== CREATE USERS ====================
  
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@playlistcreator.com' },
      update: {},
      create: {
        email: 'admin@playlistcreator.com',
        name: 'Admin User',
        password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJByJ.jl8Q8K8K8K8K8', // password: admin123
        preferences: {
          defaultPlatform: 'SPOTIFY',
          favoriteGenres: ['pop', 'rock', 'electronic'],
          language: 'pt-BR',
          theme: 'dark'
        }
      }
    }),
    prisma.user.upsert({
      where: { email: 'test@playlistcreator.com' },
      update: {},
      create: {
        email: 'test@playlistcreator.com',
        name: 'Test User',
        password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJByJ.jl8Q8K8K8K8K8', // password: test123
        preferences: {
          defaultPlatform: 'YOUTUBE',
          favoriteGenres: ['jazz', 'classical', 'ambient'],
          language: 'pt-BR',
          theme: 'light'
        }
      }
    })
  ]);

  console.log(`✅ Created ${users.length} users`);

  // ==================== CREATE SONGS ====================
  
  const songs = await Promise.all([
    // Happy Songs
    prisma.song.upsert({
      where: { platform_platformId: { platform: Platform.SPOTIFY, platformId: 'spotify_happy_1' } },
      update: {},
      create: {
        title: 'Happy',
        artist: 'Pharrell Williams',
        album: 'Girl',
        duration: 233,
        genre: 'pop',
        year: 2013,
        platform: Platform.SPOTIFY,
        platformId: 'spotify_happy_1',
        previewUrl: 'https://p.scdn.co/mp3-preview/happy_preview.mp3',
        imageUrl: 'https://i.scdn.co/image/happy_cover.jpg'
      }
    }),
    prisma.song.upsert({
      where: { platform_platformId: { platform: Platform.SPOTIFY, platformId: 'spotify_happy_2' } },
      update: {},
      create: {
        title: 'Good Vibrations',
        artist: 'The Beach Boys',
        album: 'Smile',
        duration: 216,
        genre: 'pop',
        year: 1966,
        platform: Platform.SPOTIFY,
        platformId: 'spotify_happy_2',
        previewUrl: 'https://p.scdn.co/mp3-preview/good_vibrations_preview.mp3',
        imageUrl: 'https://i.scdn.co/image/good_vibrations_cover.jpg'
      }
    }),
    prisma.song.upsert({
      where: { platform_platformId: { platform: Platform.SPOTIFY, platformId: 'spotify_happy_3' } },
      update: {},
      create: {
        title: "Don't Stop Me Now",
        artist: 'Queen',
        album: 'Jazz',
        duration: 211,
        genre: 'rock',
        year: 1978,
        platform: Platform.SPOTIFY,
        platformId: 'spotify_happy_3',
        previewUrl: 'https://p.scdn.co/mp3-preview/dont_stop_me_now_preview.mp3',
        imageUrl: 'https://i.scdn.co/image/dont_stop_me_now_cover.jpg'
      }
    }),
    
    // Sad Songs
    prisma.song.upsert({
      where: { platform_platformId: { platform: Platform.SPOTIFY, platformId: 'spotify_sad_1' } },
      update: {},
      create: {
        title: 'Someone You Loved',
        artist: 'Lewis Capaldi',
        album: 'Divinely Uninspired to a Hellish Extent',
        duration: 182,
        genre: 'pop',
        year: 2019,
        platform: Platform.SPOTIFY,
        platformId: 'spotify_sad_1',
        previewUrl: 'https://p.scdn.co/mp3-preview/someone_you_loved_preview.mp3',
        imageUrl: 'https://i.scdn.co/image/someone_you_loved_cover.jpg'
      }
    }),
    prisma.song.upsert({
      where: { platform_platformId: { platform: Platform.SPOTIFY, platformId: 'spotify_sad_2' } },
      update: {},
      create: {
        title: 'All Too Well',
        artist: 'Taylor Swift',
        album: 'Red (Taylor\'s Version)',
        duration: 329,
        genre: 'country',
        year: 2021,
        platform: Platform.SPOTIFY,
        platformId: 'spotify_sad_2',
        previewUrl: 'https://p.scdn.co/mp3-preview/all_too_well_preview.mp3',
        imageUrl: 'https://i.scdn.co/image/all_too_well_cover.jpg'
      }
    }),
    
    // Energetic Songs
    prisma.song.upsert({
      where: { platform_platformId: { platform: Platform.SPOTIFY, platformId: 'spotify_energetic_1' } },
      update: {},
      create: {
        title: 'Eye of the Tiger',
        artist: 'Survivor',
        album: 'Eye of the Tiger',
        duration: 245,
        genre: 'rock',
        year: 1982,
        platform: Platform.SPOTIFY,
        platformId: 'spotify_energetic_1',
        previewUrl: 'https://p.scdn.co/mp3-preview/eye_of_the_tiger_preview.mp3',
        imageUrl: 'https://i.scdn.co/image/eye_of_the_tiger_cover.jpg'
      }
    }),
    prisma.song.upsert({
      where: { platform_platformId: { platform: Platform.SPOTIFY, platformId: 'spotify_energetic_2' } },
      update: {},
      create: {
        title: 'Thunderstruck',
        artist: 'AC/DC',
        album: 'The Razors Edge',
        duration: 292,
        genre: 'rock',
        year: 1990,
        platform: Platform.SPOTIFY,
        platformId: 'spotify_energetic_2',
        previewUrl: 'https://p.scdn.co/mp3-preview/thunderstruck_preview.mp3',
        imageUrl: 'https://i.scdn.co/image/thunderstruck_cover.jpg'
      }
    }),
    
    // Calm Songs
    prisma.song.upsert({
      where: { platform_platformId: { platform: Platform.SPOTIFY, platformId: 'spotify_calm_1' } },
      update: {},
      create: {
        title: 'Weightless',
        artist: 'Marconi Union',
        album: 'Weightless',
        duration: 485,
        genre: 'ambient',
        year: 2011,
        platform: Platform.SPOTIFY,
        platformId: 'spotify_calm_1',
        previewUrl: 'https://p.scdn.co/mp3-preview/weightless_preview.mp3',
        imageUrl: 'https://i.scdn.co/image/weightless_cover.jpg'
      }
    }),
    prisma.song.upsert({
      where: { platform_platformId: { platform: Platform.SPOTIFY, platformId: 'spotify_calm_2' } },
      update: {},
      create: {
        title: 'Clair de Lune',
        artist: 'Claude Debussy',
        album: 'Suite Bergamasque',
        duration: 298,
        genre: 'classical',
        year: 1905,
        platform: Platform.SPOTIFY,
        platformId: 'spotify_calm_2',
        previewUrl: 'https://p.scdn.co/mp3-preview/clair_de_lune_preview.mp3',
        imageUrl: 'https://i.scdn.co/image/clair_de_lune_cover.jpg'
      }
    })
  ]);

  console.log(`✅ Created ${songs.length} songs`);

  // ==================== CREATE AUDIO FEATURES ====================
  
  const audioFeatures = await Promise.all([
    prisma.audioFeatures.upsert({
      where: { songId: songs[0].id },
      update: {},
      create: {
        songId: songs[0].id,
        danceability: 0.8,
        energy: 0.7,
        valence: 0.9,
        tempo: 160,
        loudness: -5.2,
        acousticness: 0.1,
        instrumentalness: 0.0,
        liveness: 0.3,
        speechiness: 0.1
      }
    }),
    prisma.audioFeatures.upsert({
      where: { songId: songs[1].id },
      update: {},
      create: {
        songId: songs[1].id,
        danceability: 0.7,
        energy: 0.6,
        valence: 0.8,
        tempo: 140,
        loudness: -4.8,
        acousticness: 0.2,
        instrumentalness: 0.0,
        liveness: 0.2,
        speechiness: 0.1
      }
    }),
    prisma.audioFeatures.upsert({
      where: { songId: songs[2].id },
      update: {},
      create: {
        songId: songs[2].id,
        danceability: 0.6,
        energy: 0.9,
        valence: 0.8,
        tempo: 148,
        loudness: -3.5,
        acousticness: 0.0,
        instrumentalness: 0.0,
        liveness: 0.4,
        speechiness: 0.1
      }
    })
  ]);

  console.log(`✅ Created ${audioFeatures.length} audio features`);

  // ==================== CREATE PLAYLISTS ====================
  
  const playlists = await Promise.all([
    prisma.playlist.create({
      data: {
        name: 'Happy Vibes',
        description: 'Músicas para alegrar o dia',
        userId: users[0].id,
        platform: Platform.SPOTIFY,
        mood: Mood.HAPPY,
        playlistType: PlaylistType.MOOD,
        isPublic: true,
        songCount: 3,
        duration: 660,
        songs: {
          create: [
            { songId: songs[0].id, position: 0, addedBy: users[0].id },
            { songId: songs[1].id, position: 1, addedBy: users[0].id },
            { songId: songs[2].id, position: 2, addedBy: users[0].id }
          ]
        }
      }
    }),
    prisma.playlist.create({
      data: {
        name: 'Energetic Workout',
        description: 'Músicas para treinar com energia',
        userId: users[1].id,
        platform: Platform.SPOTIFY,
        mood: Mood.ENERGETIC,
        playlistType: PlaylistType.ACTIVITY,
        isPublic: false,
        songCount: 2,
        duration: 537,
        songs: {
          create: [
            { songId: songs[5].id, position: 0, addedBy: users[1].id },
            { songId: songs[6].id, position: 1, addedBy: users[1].id }
          ]
        }
      }
    }),
    prisma.playlist.create({
      data: {
        name: 'Calm Meditation',
        description: 'Músicas para relaxar e meditar',
        userId: users[0].id,
        platform: Platform.SPOTIFY,
        mood: Mood.CALM,
        playlistType: PlaylistType.MOOD,
        isPublic: true,
        songCount: 2,
        duration: 783,
        songs: {
          create: [
            { songId: songs[7].id, position: 0, addedBy: users[0].id },
            { songId: songs[8].id, position: 1, addedBy: users[0].id }
          ]
        }
      }
    })
  ]);

  console.log(`✅ Created ${playlists.length} playlists`);

  // ==================== CREATE MOOD ANALYSES ====================
  
  const moodAnalyses = await Promise.all([
    prisma.moodAnalysis.create({
      data: {
        userId: users[0].id,
        primaryMood: Mood.HAPPY,
        confidence: 0.85,
        secondaryMoods: [Mood.ENERGETIC],
        questionnaireResponses: [
          { question: 'Como você está se sentindo?', answer: 'feliz', weight: 1 },
          { question: 'Qual seu nível de energia?', answer: 8, weight: 0.8 }
        ],
        recommendedGenres: ['pop', 'funk', 'disco'],
        playlistSuggestions: [
          {
            name: 'Happy Vibes',
            description: 'Uma seleção perfeita para quando você está se sentindo feliz',
            estimatedDuration: 45,
            mood: 'HAPPY',
            genres: ['pop', 'funk'],
            songCount: 15
          }
        ]
      }
    }),
    prisma.moodAnalysis.create({
      data: {
        userId: users[1].id,
        primaryMood: Mood.CALM,
        confidence: 0.72,
        secondaryMoods: [Mood.FOCUSED],
        questionnaireResponses: [
          { question: 'Como você está se sentindo?', answer: 'calmo', weight: 1 },
          { question: 'Qual seu nível de energia?', answer: 4, weight: 0.6 }
        ],
        recommendedGenres: ['ambient', 'classical', 'jazz'],
        playlistSuggestions: [
          {
            name: 'Calm Meditation',
            description: 'Músicas para relaxar e meditar',
            estimatedDuration: 60,
            mood: 'CALM',
            genres: ['ambient', 'classical'],
            songCount: 20
          }
        ]
      }
    })
  ]);

  console.log(`✅ Created ${moodAnalyses.length} mood analyses`);

  // ==================== CREATE PLATFORM INTEGRATIONS ====================
  
  const integrations = await Promise.all([
    prisma.platformIntegration.create({
      data: {
        userId: users[0].id,
        platform: Platform.SPOTIFY,
        accessToken: 'mock_spotify_token_' + users[0].id,
        refreshToken: 'mock_spotify_refresh_' + users[0].id,
        tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hora
        isActive: true,
        userProfile: {
          platformId: 'spotify_user_' + users[0].id,
          displayName: users[0].name,
          email: users[0].email,
          followers: 150,
          playlists: 25,
          country: 'BR'
        }
      }
    }),
    prisma.platformIntegration.create({
      data: {
        userId: users[1].id,
        platform: Platform.YOUTUBE,
        accessToken: 'mock_youtube_token_' + users[1].id,
        refreshToken: 'mock_youtube_refresh_' + users[1].id,
        tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hora
        isActive: true,
        userProfile: {
          platformId: 'youtube_user_' + users[1].id,
          displayName: users[1].name,
          email: users[1].email,
          followers: 75,
          playlists: 12,
          country: 'BR'
        }
      }
    })
  ]);

  console.log(`✅ Created ${integrations.length} platform integrations`);

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${users.length}`);
  console.log(`- Songs: ${songs.length}`);
  console.log(`- Audio Features: ${audioFeatures.length}`);
  console.log(`- Playlists: ${playlists.length}`);
  console.log(`- Mood Analyses: ${moodAnalyses.length}`);
  console.log(`- Platform Integrations: ${integrations.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
