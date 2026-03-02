# Missing Translation Keys for Backend Developer

## Overview
This document lists all translation keys that need to be added to the backend `/api/translations/{lang}` endpoint.

The app uses:
1. Backend translations via API (`/api/translations/{lang}`)
2. Local fallback translations in `src/services/i18nService.ts`

**Note:** English fallbacks are already in the frontend code. Backend should provide these in all supported languages.

---

## New Translation Keys (Already added to frontend fallbacks)

### Statistics Page
| Key | English | Turkish |
|-----|---------|---------|
| `statistics` | Statistics | İstatistikler |
| `total_listening` | Total Listening | Toplam Dinleme |
| `unique_stations` | Unique Stations | Benzersiz İstasyonlar |
| `songs_played` | Songs Played | Çalınan Şarkılar |

### Play at Login Page
| Key | English | Turkish |
|-----|---------|---------|
| `last_played_option` | Last Played | Son Çalınan |
| `random_option` | Random | Rastgele |
| `favorite_option` | Favorite | Favori |
| `off_option` | Off | Kapalı |

### Forgot Password Page
| Key | English | Turkish |
|-----|---------|---------|
| `email_sent` | Email Sent! | E-posta Gönderildi! |
| `check_email_reset` | Check your email for the password reset link | Şifre sıfırlama bağlantısı için e-postanızı kontrol edin |
| `back_to_login` | Back to Login | Girişe Dön |
| `forgot_password_title` | Forgot your password? | Şifrenizi mi unuttunuz? |
| `forgot_password_subtitle` | Enter your email address and we will send you a link to reset your password | E-posta adresinizi girin, size şifrenizi sıfırlamak için bir bağlantı gönderelim |
| `send` | Send | Gönder |

### Player Page
| Key | English | Turkish |
|-----|---------|---------|
| `no_station_playing` | No station playing | Çalan istasyon yok |
| `select_station_to_listen` | Select a station to start listening | Dinlemeye başlamak için bir istasyon seçin |
| `go_back` | Go Back | Geri Dön |
| `timer_on` | ON | AÇIK |
| `hd_quality` | HD | HD |

### Nearby Stations
| Key | English | Turkish |
|-----|---------|---------|
| `enable_location_nearby` | Enable location services to discover radio stations near you | Yakınınızdaki radyo istasyonlarını keşfetmek için konum hizmetlerini etkinleştirin |
| `no_nearby_stations` | No stations found nearby | Yakında istasyon bulunamadı |
| `try_different_location` | Try moving to a different location | Farklı bir konuma taşınmayı deneyin |

### Followers/Following
| Key | English | Turkish |
|-----|---------|---------|
| `remove` | Remove | Kaldır |
| `no_followers` | No followers yet | Henüz takipçi yok |
| `no_following` | Not following anyone yet | Henüz kimseyi takip etmiyor |

### Empty States
| Key | English | Turkish |
|-----|---------|---------|
| `search_radio_stations` | Search for radio stations, genres, and users | Radyo istasyonları, türler ve kullanıcıları arayın |

### Notifications
| Key | English | Turkish |
|-----|---------|---------|
| `started_following_you` | started following you | sizi takip etmeye başladı |
| `new_station_added` | New station added | Yeni istasyon eklendi |
| `system_notification` | System notification | Sistem bildirimi |

---

## Existing Keys (Already in backend but verify)

### Profile Page
- `profile` - Profile / Profil
- `settings` - Settings / Ayarlar
- `about_us` - About Us / Hakkımızda
- `statistics` - Statistics / İstatistikler
- `notifications` - Notifications / Bildirimler
- `private_profile` - Private Profile / Gizli Profil
- `play_at_login` - Play at Login / Girişte Çal
- `account` - Account / Hesap
- `privacy_policy` - Privacy Policy / Gizlilik Politikası
- `terms_and_conditions` - Terms and Conditions / Şartlar ve Koşullar
- `logout` - Logout / Çıkış

### Tab Labels
- `tab_discover` - Discover / Keşfet
- `tab_favorites` - Favorites / Favoriler
- `tab_profile` - Profile / Profil

### CarPlay
- `carplay_discover` - Discover / Keşfet
- `carplay_favorites` - Favorites / Favoriler
- `carplay_recently_played` - Recently Played / Son Çalınanlar
- `carplay_genres` - Genres / Türler
- `carplay_search` - Search / Ara

---

## Implementation Notes

1. **API Format Expected:**
```json
{
  "statistics": "İstatistikler",
  "total_listening": "Toplam Dinleme",
  "unique_stations": "Benzersiz İstasyonlar",
  ...
}
```

2. **Frontend Usage:**
```typescript
const { t } = useTranslation();
<Text>{t('statistics', 'Statistics')}</Text>
// First param: key, Second param: English fallback
```

3. **Priority:**
   - P0: Profile page strings
   - P1: Statistics, Notifications, Player pages
   - P2: Empty states, error messages

---

## Languages Supported
- English (en) - Default/Fallback
- Turkish (tr) - Primary
- German (de)
- French (fr)
- Spanish (es)
- Arabic (ar)
- And others...

---

Generated: March 2025
