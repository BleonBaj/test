import os

# Funksion recursive për të fshirë të gjitha .md file
def delete_md_files(folder):
    for root, dirs, files in os.walk(folder):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                try:
                    os.remove(file_path)
                    print(f'U fshi: {file_path}')
                except Exception as e:
                    print(f'Gabim me {file_path}: {e}')

# Fshij nga folderi ku ekzekutohet skripti
current_folder = os.getcwd()
delete_md_files(current_folder)
print("Procesi përfundoi.")
