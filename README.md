## Uruchomienie testów automatycznych (Playwright)

Dla wygody sprawdzającego zadanie, repozytorium zostało przygotowane w sposób umożliwiający uruchomienie testów **natychmiast po sklonowaniu**. Plik `.env` zawiera niezbędne dane dostępowe do środowiska testowego, a pliki `auth-owner.json` i `auth-tester.json` przechowują zapisane stany sesji (omijając konieczność każdorazowego logowania i weryfikacji mailowej).

### Wymagania
* **Node.js** (wersja 20 lub nowsza). 
  *Jeśli nie masz jeszcze zainstalowanego środowiska Node.js, pobierz je z [oficjalnej strony nodejs.org](https://nodejs.org/) lub skorzystaj z menedżera wersji (np. `nvm` / `nvm-windows`).*
* Przeglądarki wspierane przez Playwright (instalowane automatycznie w kolejnych krokach).

### Instalacja i uruchomienie
1. Sklonuj repozytorium i przejdź do folderu z projektem.
2. Zainstaluj zależności:
   `npm install`
3. Zainstaluj przeglądarki wymagane przez Playwright:
   `npx playwright install`
4. Uruchom testy (tryb headless):
   `npx playwright test`

### Przydatne komendy
* Uruchomienie z widocznym UI przeglądarki: `npx playwright test --headed`
* Wyświetlenie raportu po wykonaniu testów: `npx playwright show-report`
### Analiza testów krok po kroku (Debugowanie)
Ponieważ domyślna konfiguracja uruchamia testy w 3 silnikach przeglądarek, w celu prześledzenia działania scenariusza krok po kroku, zalecam uruchomienie testu tylko dla jednej przeglądarki:

* **Uruchomienie tylko w Chrome (widoczne okno przeglądarki):**
  `npx playwright test --project=chromium --headed`

## Podsumowanie wyników testów (Executive Summary)
Przeprowadzono testy eksploracyjne i manualne mechanizmu powiadomień zgodnie z wymaganiami. Wykryto łącznie **12 błędów**, z czego większość bezpośrednio potwierdza zgłoszenie Piotra: powiadomienia o komentarzach (zarówno od Klienta, jak i od innych członków zespołu) trafiają w większości przypadków **wyłącznie do Właściciela**, całkowicie pomijając pozostałych członków zespołu powiązanych z listą/projektem. 

Zidentyfikowano:
* **2 błędy o priorytecie Critical** (Całkowity brak powiadomień dla jakiegokolwiek użytkownika po dodaniu komentarza wewnątrz zespołu).
* **8 błędów o priorytecie Major** (Odbiorcą powiadomienia jest jedynie założyciel/owner).
* **2 błędy Minor** (np. błędy logiki w oznaczaniu @self).

Dodatkowo zaimplementowano testy automatyczne E2E (Playwright + TypeScript), w tym test weryfikujący poprawną ścieżkę (Sanity) oraz test regresyjny udowadniający istnienie głównego defektu (BUG-01).

# Scenariusze testowe – System Powiadomień o Komentarzach (KIS List)

## Kontekst i Użytkownicy
* **Członkowie zespołu:** Tester (Właściciel / Owner), Tester2 (Członek zespołu / Team Member)
* **Klient:** Odbiorca zewnętrzny posiadający unikalny token/link do propozycji lub listy

---

## 1. Scenariusze Pozytywne

### Scenariusz-01: Powiadomienie zespołu o komentarzu Klienta w Propozycji
* **Given:** Lista jest udostępniona Klientowi w formie Propozycji
* **And:** Użytkownicy Tester i Tester2 są powiązani z tą listą
* **When:** Klient doda komentarz do dowolnego elementu w Propozycji
* **Then:** Tester otrzymuje powiadomienie o treści "Klient dodał komentarz do propozycji"
* **And:** Tester2 otrzymuje powiadomienie o treści "Klient dodał komentarz do propozycji"
* **Status:** Fail ([Zgłoszono: BUG-10](#bug-10))

### Scenariusz-02: Powiadomienie zespołu o komentarzu Klienta na Udostępnionej Liście (Live Preview)
* **Given:** Lista jest udostępniona Klientowi w trybie podglądu na żywo (Live)
* **And:** Użytkownik Tester2 jest powiązany z tą listą
* **When:** Klient doda komentarz do udostępnionej listy
* **Then:** Tester2 otrzymuje powiadomienie o treści "Klient dodał komentarz do udostępnionej listy"
* **Status:** Fail ([Zgłoszono: BUG-01](#bug-01))

### Scenariusz-03: Powiadomienie pozostałych członków zespołu o komentarzu wewnętrznym
* **Given:** Użytkownicy Tester i Tester2 są powiązani z tą samą listą
* **When:** Tester2 doda komentarz do elementu listy
* **Then:** Tester otrzymuje powiadomienie o nowym komentarzu od użytkownika Tester2
* **And:** Tester2 nie otrzymuje powiadomienia o własnym komentarzu
* **Status:** Fail ([Zgłoszono: BUG-02](#bug-02), [BUG-03](#bug-03))

### Scenariusz-04: Powiadomienie ze wzmianką użytkownika (@mention)
* **Given:** Użytkownicy Tester i Tester2 są powiązani z tą samą listą
* **When:** Tester doda komentarz z oznaczeniem "@Tester2"
* **Then:** Tester2 otrzymuje dedykowane powiadomienie o oznaczeniu go w komentarzu
* **Status:** Pass / Blok ([Zgłoszono uwagę: BUG-04](#bug-04))

---

## 2. Scenariusze Negatywne

### Scenariusz-05: Brak powiadomienia dla autora komentarza (Self-notification)
* **Given:** Użytkownik Tester jest zalogowany w aplikacji
* **When:** Tester opublikuje komentarz pod elementem listy
* **Then:** W panelu powiadomień użytkownika Tester nie pojawia się nowe powiadomienie dotyczące jego własnej akcji
* **Status:** Fail *(w przypadku użycia @self – [Zgłoszono: BUG-05](#bug-05))*

### Scenariusz-06: Brak powiadomienia dla członka zespołu niepowiązanego z listą
* **Given:** Użytkownik Tester jest powiązany z "Listą A"
* **And:** Użytkownik Tester2 nie jest powiązany z "Listą A" (brak uprawnień/przypisania)
* **When:** Klient doda komentarz do "Listy A"
* **Then:** Tester otrzymuje powiadomienie o komentarzu
* **And:** Tester2 nie otrzymuje powiadomienia o komentarzu z "Listy A"
* **Status:** Pass

### Scenariusz-07: Próba wysłania pustego komentarza przez Klienta
* **Given:** Klient otworzył udostępnioną listę lub propozycję
* **When:** Klient próbuje wysłać komentarz składający się wyłącznie z białych znaków (spacji)
* **Then:** Przycisk publikacji komentarza pozostaje nieaktywny lub wyświetla się błąd walidacji
* **And:** Żaden członek zespołu nie otrzymuje powiadomienia
* **Status:** Pass

---

## 3. Scenariusze Brzegowe (Edge Cases)

### Scenariusz-08: Jednoczesne dodanie komentarza przez Klienta i członka zespołu (Race Condition)
* **Given:** Klient oraz użytkownik Tester edytują tę samą sekcję dyskusji
* **When:** Klient i Tester zatwierdzą dodanie komentarza w tej samej chwili
* **Then:** Oba komentarze zostają poprawnie zapisane i wyświetlone w wątku
* **And:** Tester otrzymuje powiadomienie wyłącznie o komentarzu Klienta
* **Status:** Pass

### Scenariusz-09: Komentarz na liście z wieloma przypisanymi osobami
* **Given:** Do projektu przypisano więcej niż 2 członków zespołu (np. Tester, Tester2 i kolejni współpracownicy)
* **When:** Klient doda komentarz do propozycji
* **Then:** Każdy przypisany członek zespołu otrzymuje indywidualne powiadomienie w systemie
* **Status:** Fail ([Zgłoszono: BUG-10](#bug-10))

---

## 4. Wykryte Błędy (Bug Reports)

### Moduł: Lista

<a id="bug-01"></a>
#### BUG-01: Klient komentuje produkt w udostępnionej liście – powiadomienie trafia wyłącznie do właściciela
* **Obszar:** Udostępniona lista (Live)
* **Priorytet / Severity:** High / Major
* **Kroki do odtworzenia:**
  1. Zaloguj się jako Tester (Właściciel) i przejdź do widoku wybranej listy.
  2. Kliknij opcję udostępniania i wygeneruj link do podglądu na żywo (Live Preview).
  3. Upewnij się, że do listy dodany jest drugi użytkownik: Tester2 (jako Członek zespołu).
  4. Otwórz wygenerowany link w oknie incognito (jako Klient).
  5. W widoku Klienta przejdź do dowolnego produktu na liście, rozwiń sekcję komentarzy, wpisz treść komentarza i zatwierdź wysłanie.
  6. W osobnej sesji zaloguj się jako Tester2 i kliknij ikonę dzwonka / centrum powiadomień.
* **Oczekiwany rezultat:** Wszyscy powiązani członkowie zespołu (Tester oraz Tester2) otrzymują w centrum powiadomień informację: „Klient dodał komentarz do udostępnionej listy”.
* **Aktualny rezultat:** Powiadomienie pojawia się wyłącznie na koncie Właściciela (Tester). W centrum powiadomień użytkownika Tester2 brak jakiegokolwiek powiadomienia.

---

<a id="bug-02"></a>
#### BUG-02: Brak powiadomień po dodaniu standardowego komentarza do produktu przez członka zespołu
* **Obszar:** Lista (widok wewnętrzny)
* **Priorytet / Severity:** High / Critical
* **Kroki do odtworzenia:**
  1. Zaloguj się na konto Członka zespołu (Tester2).
  2. Przejdź do współdzielonej listy projektowej, do której przypisany jest również Właściciel (Tester).
  3. Otwórz szczegóły wybranego produktu z listy.
  4. W polu dodawania komentarza wpisz standardowy tekst (bez używania prefiksu `@`) i kliknij przycisk publikacji.
  5. Zaloguj się jako Właściciel (Tester) oraz pozostali członkowie zespołu i sprawdź centrum powiadomień.
* **Oczekiwany rezultat:** Właściciel oraz pozostali członkowie zespołu powiązani z listą otrzymują powiadomienie o nowym komentarzu dodanym przez Tester2.
* **Aktualny rezultat:** Żaden użytkownik w systemie nie otrzymuje powiadomienia.

---

<a id="bug-03"></a>
#### BUG-03: Brak powiadomień po dodaniu standardowego komentarza do produktu przez właściciela listy
* **Obszar:** Lista (widok wewnętrzny)
* **Priorytet / Severity:** High / Critical
* **Kroki do odtworzenia:**
  1. Zaloguj się jako Właściciel listy (Tester).
  2. Przejdź do widoku projektu, a następnie wejdź w docelową listę.
  3. Kliknij w dowolny produkt na liście, aby otworzyć panel boczny / modal z dyskusją.
  4. Wprowadź treść komentarza bez używania wzmianki `@` i zatwierdź publikację.
  5. Przeloguj się na konto przypisanego Członka zespołu (Tester2) i otwórz listę powiadomień.
* **Oczekiwany rezultat:** Członek zespołu (Tester2) otrzymuje powiadomienie in-app informujące o nowym komentarzu dodanym przez Właściciela listy.
* **Aktualny rezultat:** Na koncie Członka zespołu nie pojawia się żadne powiadomienie.

---

<a id="bug-04"></a>
#### BUG-04: Wzmianka `@mention` blokuje ogólne powiadomienie dla pozostałych osób przypisanych do listy
* **Obszar:** Lista (Mechanizm `@mention`)
* **Priorytet / Severity:** Medium / Major
* **Kroki do odtworzenia:**
  1. Zaloguj się na konto członka zespołu powiązanego z listą, do której przypisanych jest co najmniej 3 współpracowników.
  2. Otwórz listę i przejdź do karty konkretnego produktu.
  3. W polu komentarza wpisz znak `@`, wybierz z podpowiedzi tylko jednego użytkownika (np. `@Tester2`) i opublikuj wiadomość.
  4. Zaloguj się na konta:
     * Oznaczonego użytkownika (Tester2),
     * Pozostałych członków zespołu powiązanych z tą listą.
* **Oczekiwany rezultat:** Oznaczony użytkownik (Tester2) otrzymuje dedykowane powiadomienie o oznaczeniu go w dyskusji, a pozostali członkowie powiązani z listą otrzymują powiadomienie o pojawieniu się nowego komentarza.
* **Aktualny rezultat:** Powiadomienie otrzymuje wyłącznie osoba oznaczona tokenem `@mention`. Reszta powiązanego zespołu nie otrzymuje żadnej notyfikacji.

---

<a id="bug-05"></a>
#### BUG-05: Możliwość oznaczenia samego siebie (`@self`) i generowanie powiadomienia do autora
* **Obszar:** Lista (Mechanizm `@mention`)
* **Priorytet / Severity:** Low / Minor
* **Kroki do odtworzenia:**
  1. Zaloguj się jako Tester i wejdź do dowolnej listy.
  2. Kliknij w produkt, aby otworzyć sekcję komentarzy.
  3. W polu tekstowym wpisz znak `@` i sprawdź listę rozwijaną.
  4. Wybierz z listy własne konto (Tester), dopisz tekst i kliknij przycisk wyślij.
  5. Sprawdź ikonę dzwonka / powiadomień zalogowanego użytkownika.
* **Oczekiwany rezultat:** Własne konto użytkownika powinno być odfiltrowane z listy podpowiedzi `@mention`, a system w żadnym wypadku nie powinien emitować powiadomienia do autora akcji.
* **Aktualny rezultat:** Autor może wybrać z listy podpowiedzi samego siebie; system natychmiast generuje powiadomienie in-app skierowane do autora komentarza.

---

### Moduł: Projekt

<a id="bug-06"></a>
#### BUG-06: Komentarz członka zespołu w sekcji „Dyskusja do projektu” trafia tylko do właściciela
* **Obszar:** Projekt -> Dyskusja do projektu (Prywatne / Komentarze klienta)
* **Priorytet / Severity:** Medium / Major
* **Kroki do odtworzenia:**
  1. Zaloguj się jako Członek zespołu (Tester2).
  2. Przejdź do widoku wybranego Projektu i kliknij zakładkę „Dyskusja do projektu”.
  3. Wejdź w sekcję „Prywatne” lub „Komentarze klienta”, wpisz wiadomość i opublikuj komentarz.
  4. Sprawdź powiadomienia na koncie Właściciela projektu (Tester) oraz na kontach ewentualnych pozostałych członków zespołu przypisanych do tego projektu.
* **Oczekiwany rezultat:** Wszyscy użytkownicy wewnętrzni powiązani z projektem otrzymują notyfikację o nowym wpisie w dyskusji projektu.
* **Aktualny rezultat:** Powiadomienie trafia wyłącznie do Właściciela projektu. Pozostali powiązani członkowie zespołu nie dostają żadnej informacji.

---

<a id="bug-07"></a>
#### BUG-07: Komentarz właściciela w sekcji „Dyskusja do projektu -> Prywatne” nie generuje powiadomień
* **Obszar:** Projekt -> Dyskusja do projektu (Prywatne)
* **Priorytet / Severity:** Medium / Major
* **Kroki do odtworzenia:**
  1. Zaloguj się jako Właściciel projektu (Tester).
  2. Przejdź do widoku Projektu i otwórz zakładkę „Dyskusja do projektu”.
  3. Wybierz zakładkę „Prywatne”, wprowadź treść komentarza i zatwierdź wysyłkę.
  4. Zaloguj się na konto przypisanego Członka zespołu (Tester2) i zweryfikuj skrzynkę powiadomień.
* **Oczekiwany rezultat:** Wszyscy powiązani członkowie zespołu otrzymują powiadomienie o nowym wpisie w prywatnej dyskusji projektu.
* **Aktualny rezultat:** Żaden z powiązanych członków zespołu nie otrzymuje notyfikacji.

---

<a id="bug-08"></a>
#### BUG-08: Klient komentuje projekt – powiadomienie otrzymuje wyłącznie właściciel
* **Obszar:** Projekt -> Komentarze klienta
* **Priorytet / Severity:** High / Major
* **Kroki do odtworzenia:**
  1. Z poziomu Klienta (poprzez udostępniony widok projektu/komentarzy) dodaj ogólny komentarz do projektu.
  2. Zaloguj się jako Właściciel (Tester) oraz jako Członek zespołu (Tester2).
  3. Zweryfikuj listę powiadomień in-app dla obu kont.
* **Oczekiwany rezultat:** Zarówno Właściciel projektu, jak i wszyscy przypisani członkowie zespołu otrzymują powiadomienie o komentarzu Klienta.
* **Aktualny rezultat:** Powiadomienie pojawia się wyłącznie na koncie Właściciela. Konto Członka zespołu nie rejestruje żadnego powiadomienia.

---

### Moduł: Propozycja

<a id="bug-09"></a>
#### BUG-09: Decyzja klienta w propozycji powiadamia tylko jednego członka zespołu
* **Obszar:** Propozycja
* **Priorytet / Severity:** High / Major
* **Kroki do odtworzenia:**
  1. Zaloguj się jako Właściciel i wyślij propozycję na adres email Klienta.
  2. Otwórz link z wiadomości e-mail w oknie prywatnym (jako Klient).
  3. W widoku propozycji wybierz dowolną pozycję i kliknij przycisk akceptacji lub odrzucenia decyzji.
  4. Zweryfikuj powiadomienia na koncie Właściciela projektu (Tester) oraz na koncie Członka zespołu (Tester2).
* **Oczekiwany rezultat:** Wszyscy członkowie zespołu powiązani z listą oraz Właściciel projektu otrzymują powiadomienie o podjętej przez Klienta decyzji.
* **Aktualny rezultat:** Powiadomienie otrzymuje wyłącznie Członek zespołu (Tester2). Właściciel projektu nie otrzymuje powiadomienia o decyzji Klienta.

---

<a id="bug-10"></a>
#### BUG-10: Klient komentuje pozycję w propozycji – niepełna lista odbiorców powiadomienia
* **Obszar:** Propozycja
* **Priorytet / Severity:** High / Major
* **Kroki do odtworzenia:**
  1. Otwórz otrzymany link do propozycji jako Klient.
  2. Przejdź do wybranej pozycji oferty, rozwiń sekcję dyskusji i opublikuj komentarz.
  3. Sprawdź powiadomienia na koncie Właściciela, Członka zespołu (Tester2) oraz dodatkowych członków zespołu powiązanych z projektem.
* **Oczekiwany rezultat:** Zgodnie z wymaganiem biznesowym powiadomienie powinni otrzymać wszyscy członkowie zespołu powiązani z listą.
* **Aktualny rezultat:** Powiadomienie trafia jedynie do Właściciela oraz do Tester2. Dalsi współpracownicy powiązani z projektem są pomijani przez silnik powiadomień.

---

<a id="bug-11"></a>
#### BUG-11: Brak powiadomień po dodaniu komentarza lub odpowiedzi przez członka zespołu w propozycji
* **Obszar:** Propozycja
* **Priorytet / Severity:** Medium / Major
* **Kroki do odtworzenia:**
  1. Zaloguj się na konto Członka zespołu (Tester2).
  2. Otwórz projekt, wejdź w moduł Propozycji i kliknij w pozycję zawierającą komentarz Klienta.
  3. Kliknij „Odpowiedz” (lub dodaj nowy komentarz do pozycji) i zatwierdź formularz.
  4. Zaloguj się na konto Właściciela (Tester) i pozostałych członków zespołu, a następnie zweryfikuj centrum powiadomień.
* **Oczekiwany rezultat:** Pozostali członkowie zespołu powiązani z propozycją oraz Właściciel otrzymują powiadomienie o nowej odpowiedzi/komentarzu.
* **Aktualny rezultat:** Żaden użytkownik wewnętrzny nie otrzymuje notyfikacji.

---

<a id="bug-12"></a>
#### BUG-12: Brak powiadomień po dodaniu komentarza przez właściciela do pozycji w propozycji
* **Obszar:** Propozycja
* **Priorytet / Severity:** Medium / Major
* **Kroki do odtworzenia:**
  1. Zaloguj się jako Właściciel projektu (Tester).
  2. Wejdź w moduł Propozycji powiązany z daną listą.
  3. Wybierz konkretną pozycję, wprowadź komentarz w wątku dyskusji i opublikuj go.
  4. Zaloguj się jako Członek zespołu (Tester2) i otwórz powiadomienia in-app.
* **Oczekiwany rezultat:** Wszyscy powiązani członkowie zespołu otrzymują powiadomienie o komentarzu Właściciela.
* **Aktualny rezultat:** Na koncie Członka zespołu nie pojawia się żadne powiadomienie.

---
