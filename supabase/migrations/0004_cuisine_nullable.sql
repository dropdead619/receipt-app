-- Кухня у рецепта стала необязательной (форма ручного добавления)
alter table recipes alter column cuisine drop not null;
