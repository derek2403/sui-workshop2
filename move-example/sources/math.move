/// Example Move module for Gas Station demo
/// This module provides simple math operations that can be called from the frontend
module move_example::math {
    use sui::event;

    /// Event emitted when an addition is performed
    public struct AdditionEvent has copy, drop {
        a: u64,
        b: u64,
        result: u64,
    }

    /// Event emitted when a multiplication is performed
    public struct MultiplicationEvent has copy, drop {
        a: u64,
        b: u64,
        result: u64,
    }

    /// Add two numbers and emit an event
    public entry fun add(a: u64, b: u64) {
        let result = a + b;
        event::emit(AdditionEvent { a, b, result });
    }

    /// Multiply two numbers and emit an event
    public entry fun multiply(a: u64, b: u64) {
        let result = a * b;
        event::emit(MultiplicationEvent { a, b, result });
    }

    /// Simple hello world function for testing
    public entry fun hello_world() {
        // This function does nothing, just for testing connectivity
    }
}


