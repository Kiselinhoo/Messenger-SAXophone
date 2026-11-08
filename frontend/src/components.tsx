import React from 'react';

// Мелкая правка: добавил интерфейс ButtonProps для типизации.
// Это нужно, чтобы TypeScript понимал, какие данные принимает кнопка.
interface ButtonProps {
  text: string;
  onClick?: () => void;
  disabled?: boolean;
}

// Правка по ревью: уточнил комментарий. 
// Кнопка поддерживает блокировку (disabled), но состоянием загрузки управляет родительская форма, 
// которая передает сюда этот пропс. 
export const Button: React.FC<ButtonProps> = ({ text, onClick, disabled = false }) => (
  <button onClick={onClick} disabled={disabled} className="button">
    {text}
  </button>
);

// Мелкая правка: добавил интерфейс InputProps для типизации пропсов поля ввода.
interface InputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
}

// Поле ввода. Добавил пропс error, чтобы подсвечивать красным, если пользователь ошибся.
// Использую классы "field" и "input" из styles.css для красивого отображения.
export const Input: React.FC<InputProps> = ({ label, value, onChange, error, type = 'text' }) => (
  <div className="field">
    {/* Связываю label с полем ввода для доступности */}
    <label>{label}</label>
    <input type={type} value={value} onChange={onChange} aria-invalid={!!error} />
    {/* Если есть текст ошибки, вывожу его красным цветом */}
    {error && <small role="alert">{error}</small>}
  </div>
);

// Мелкая правка: добавил интерфейс CardProps, чтобы указать, что карточка принимает внутри себя другие элементы.
interface CardProps {
  children: React.ReactNode;
}

// Карточка. Просто обертка, чтобы форма была по центру экрана. 
// Использую класс "card" из styles.css.
export const Card: React.FC<CardProps> = ({ children }) => (
  <div className="card">{children}</div>
);
