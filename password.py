def main():
    secret = input("Enter a 7-character password (5 lowercase letters + 2 digits): ").strip()
    if len(secret) != 7 or not (secret[:5].islower() and secret[:5].isalpha() and secret[5:].isdigit()):
        print("Password must be exactly 5 lowercase letters followed by 2 digits.")
        return

    from string import ascii_lowercase, digits
    from itertools import product

    all_guesses = (
        ''.join(chars) + ''.join(nums)
        for chars in product(ascii_lowercase, repeat=5)
        for nums in product(digits, repeat=2)
    )

    for guess in all_guesses:
        print(f"Trying: {guess}")
        if guess == secret:
            print(f"\nPassword found: {secret!r}")
            return

if __name__ == "__main__":
    main()
