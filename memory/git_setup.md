# Git & Setup Info

## Repository
- URL: https://github.com/evolutionphil/megaradioIOSAndroidReact.git
- User: evolutionphil

## Full Setup Command
```bash
git clone https://evolutionphil:GITHUB_PAT_TOKEN@github.com/evolutionphil/megaradioIOSAndroidReact.git && cd megaradioIOSAndroidReact/frontend && yarn install && npx patch-package && cd ios && pod install && cd ..
```

## Notes
- GitHub PAT token'ı kullanıcıdan alınmalı (güvenlik için burada saklanmıyor)
- patch-package native fix'leri uygulamak için gerekli
- pod install sadece macOS'ta çalışır (iOS build için)
