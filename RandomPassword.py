import random
from itertools import product

def main():
 
    passwords = [
        "Sara", "Dammam", "nutritionist", "since", "2016", "King", "Faisal",
        "University", "5", "Rayan", "Majid", "Al", "Mohandis", "Hyundai",
        "Tucson", "2020", "sara", "fitness"
    ]

    secret = input("Enter the password : ").strip()

    print("\nStarting brute-force with combinations of word list…\n")

    
    found = False
    for r in range(1, 4):
        for combo in product(passwords, repeat=r):
            guess = ''.join(combo)
            print(f"Trying: {guess}")
            if guess == secret:
                print(f"\nPassword found: {secret!r}")
                found = True
                break
        if found:
            break

    if not found:
        print("\nPassword not found using combinations of the list.")

if __name__ == "__main__":
    main()